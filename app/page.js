'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import InputArea from '../components/InputArea';

function ChatContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    const getGreeting = () => {
        const name = session?.user?.name || 'there';
        return `Hello ${name}, how can I help you today?`;
    };

    // Init from URL
    useEffect(() => {
        const urlChatId = searchParams.get('chatId');
        if (urlChatId) {
            setCurrentChatId(urlChatId);
        }
    }, [searchParams]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Load chat messages when ID changes
    useEffect(() => {
        if (currentChatId) {
            fetchMessages(currentChatId);
        } else {
            setMessages([{ id: 'welcome', role: 'ai', text: getGreeting() }]);
        }
    }, [currentChatId, session?.user?.name]);

    const fetchMessages = async (chatId) => {
        try {
            const res = await fetch(`/api/chats/${chatId}`);
            if (res.ok) {
                const data = await res.json();
                // Map DB message format to UI format
                const uiMessages = data.map(m => ({ id: m.id, role: m.role, text: m.content }));

                // Always prepend the welcome message to the fetched history
                setMessages([
                    { id: 'welcome', role: 'ai', text: getGreeting() },
                    ...uiMessages
                ]);
            }
        } catch (err) {
            console.error("Failed to load messages");
        }
    };

    const handleSendMessage = async (text) => {
        if (!text.trim()) return;

        // Optimistic User Message
        const userMsg = { id: Date.now(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        let chatId = currentChatId;

        try {
            // 1. If new chat, create it in DB
            if (!chatId && session) {
                const createRes = await fetch('/api/chats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text }),
                });
                if (createRes.ok) {
                    const newChat = await createRes.json();
                    chatId = newChat.id;
                }
            }

            // 2. Save User Message to DB
            if (chatId && session) {
                await fetch(`/api/chats/${chatId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'user', content: text }),
                });

                // Set ID after saving to ensure fetchMessages sees the new message
                if (!currentChatId) {
                    setCurrentChatId(chatId);
                    router.push(`/?chatId=${chatId}`);
                }
            }

            // 3. Get AI Response
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: session ? messages : [] }),
            });

            const data = await response.json();
            const aiText = data.reply;


            // Streaming Simulation
            const aiMsgId = Date.now() + 1;
            setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: '' }]);

            let currentText = '';
            const chunks = aiText.match(/(.|[\r\n]){1,4}/g) || [];

            for (const chunk of chunks) {
                currentText += chunk;
                setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: currentText } : msg));
                await new Promise(resolve => setTimeout(resolve, 15));
            }

            // 4. Save AI Message to DB
            if (chatId && session) {
                await fetch(`/api/chats/${chatId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'ai', content: aiText }),
                });
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: `Error: ${error.message || "I encountered an error."}` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectChat = (id) => {
        setCurrentChatId(id);
        if (id) {
            router.push(`/?chatId=${id}`);
        } else {
            router.push('/');
        }
    };

    return (
        <div className="layout-container" style={{ display: 'flex', width: '100%', height: '100%' }}>
            <Sidebar
                currentChatId={currentChatId}
                onSelectChat={handleSelectChat}
            />
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <ChatArea messages={messages} loading={loading} scrollRef={scrollRef} />
                <InputArea onSend={handleSendMessage} loading={loading} />
            </main>
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>
                Loading Chat...
            </div>
        }>
            <ChatContent />
        </Suspense>
    );
}
