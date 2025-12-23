'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import InputArea from '@/components/InputArea';

function ChatContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);
    const chatId = params.chatId;
    const trigger = searchParams.get('trigger');

    const getGreeting = () => {
        const name = session?.user?.name || 'there';
        return `Hello ${name}, how can I help you today?`;
    };

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Load chat messages when ID changes
    useEffect(() => {
        if (chatId) {
            fetchMessages(chatId, trigger === 'true');
        }
    }, [chatId, session?.user?.name]);

    const fetchMessages = async (id, shouldTriggerAI = false) => {
        try {
            const res = await fetch(`/api/chats/${id}`);
            if (res.ok) {
                const data = await res.json();
                const uiMessages = data.messages.map(m => ({
                    id: m.id,
                    role: m.role,
                    text: m.text,
                    image: m.image
                }));

                setMessages([
                    { id: 'welcome', role: 'ai', text: getGreeting() },
                    ...uiMessages
                ]);

                // Update Brower Tab Title
                if (data.title) {
                    document.title = `${data.title} | Promptly AI`;
                }

                // If trigger is true and we only have one user message
                if (shouldTriggerAI && uiMessages.length === 1 && uiMessages[0].role === 'user') {
                    handleSendMessage(uiMessages[0].text, uiMessages[0].image || null, true);
                    router.replace(`/c/${id}`);
                }
            } else {
                router.replace('/');
            }
        } catch (err) {
            console.error("Failed to load messages");
            router.replace('/');
        }
    };

    const handleSendMessage = async (text = '', image = null, isAutoTrigger = false) => {
        if (!text?.trim() && !image) return;

        if (!isAutoTrigger) {
            const userMsg = { id: Date.now(), role: 'user', text, image };
            setMessages(prev => [...prev, userMsg]);
        }
        setLoading(true);

        try {
            // Save User Message to DB (Only if it's a NEW message from the UI, not an auto-trigger)
            if (chatId && session && !isAutoTrigger) {
                const saveRes = await fetch(`/api/chats/${chatId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'user', content: text, image }),
                });

                if (saveRes.ok) {
                    const saveData = await saveRes.json();
                    if (saveData.updatedTitle) {
                        document.title = `${saveData.updatedTitle} | Promptly AI`;
                    }
                    window.dispatchEvent(new CustomEvent('chatUpdated'));
                }
            }

            // Get AI Response
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: session ? messages : [], image }),
            });

            const data = await response.json();
            const aiText = data.reply;

            const aiMsgId = Date.now() + 1;
            setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: '' }]);

            let currentText = '';
            const chunks = aiText.match(/(.|[\r\n]){1,4}/g) || [];

            for (const chunk of chunks) {
                currentText += chunk;
                setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: currentText } : msg));
                await new Promise(resolve => setTimeout(resolve, 15));
            }

            if (chatId && session) {
                try {
                    await fetch(`/api/chats/${chatId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role: 'ai', content: aiText }),
                    });
                } catch (saveErr) {
                    console.error("Failed to save AI response:", saveErr);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: `Error: ${error.message || "I encountered an error."}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ChatArea messages={messages} loading={loading} scrollRef={scrollRef} />
            <InputArea onSend={handleSendMessage} loading={loading} />
        </>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>Loading...</div>}>
            <ChatContent />
        </Suspense>
    );
}
