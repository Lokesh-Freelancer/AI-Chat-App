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
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    const getGreeting = () => {
        const name = session?.user?.name || 'there';
        return `Hello ${name}, how can I help you today?`;
    };

    // Redirect old ?chatId=... URLs to /c/[id]
    // Reset Title on home
    useEffect(() => {
        document.title = 'Promptly AI - Smart Assistant';
    }, []);

    useEffect(() => {
        const urlChatId = searchParams.get('chatId');
        if (urlChatId) {
            router.replace(`/c/${urlChatId}`);
        }
    }, [searchParams]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Initial Welcome Message for New Chat
    useEffect(() => {
        setMessages([{ id: 'welcome', role: 'ai', text: getGreeting() }]);
    }, [session?.user?.name]);

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
        setMessages(prev => [...prev, { id: 'initial', role: 'user', text }]);
        setLoading(true);

        try {
            // 1. Create new chat in DB
            if (session) {
                const createRes = await fetch('/api/chats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text }),
                });

                if (createRes.ok) {
                    const newChat = await createRes.json();

                    // 2. Save the first user message
                    await fetch(`/api/chats/${newChat.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role: 'user', content: text }),
                    });

                    // 3. IMMEDIATELY redirect to the new chat page
                    // We pass 'trigger=true' so the new page knows to generate the first AI response
                    if (newChat.id) {
                        // Redirect immediately after chat is created on server
                        window.dispatchEvent(new CustomEvent('chatUpdated'));
                        router.push(`/c/${newChat.id}?trigger=true`);
                    }
                }
            } else {
                // Guest mode - respond locally
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, history: [] }),
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
            }
        } catch (error) {
            console.error('Initial Send Error:', error);
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
