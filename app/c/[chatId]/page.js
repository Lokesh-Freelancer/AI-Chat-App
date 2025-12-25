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
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const scrollRef = useRef(null);
    const chatId = params.chatId;
    const trigger = searchParams.get('trigger');
    const hasTriggeredRef = useRef(false);
    const abortControllerRef = useRef(null);
    const isStoppedRef = useRef(false);

    const getGreeting = () => {
        const name = session?.user?.name || 'there';
        const isGuest = !session?.user?.name;

        const lastVisit = localStorage.getItem('lastVisit');
        const now = Date.now();

        // Guest user ke liye simple greeting
        if (isGuest) {
            return "Hi there! How can I help you today?";
        }

        // Logged-in user ke liye personalized greeting
        if (!lastVisit) {
            return `Welcome ${name}! 👋 I'm here to help you with anything.`;
        }

        const hoursSinceLastVisit = (now - parseInt(lastVisit)) / (1000 * 60 * 60);

        if (hoursSinceLastVisit < 1) {
            return `Welcome back ${name}! Ready to continue?`;
        } else if (hoursSinceLastVisit < 24) {
            return `Hey ${name}! Good to see you again. What's on your mind?`;
        } else {
            return `Welcome back ${name}! It's been a while. How can I help?`;
        }
    };

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isGenerating, statusMessage]);

    // Cleanup abort controller on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Load chat messages when ID changes
    useEffect(() => {
        if (chatId) {
            fetchMessages(chatId, trigger === 'true');
        }
    }, [chatId, session?.user?.name]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        isStoppedRef.current = true;
        setIsGenerating(false);
        setStatusMessage(null);
    };

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

                // Update Browser Tab Title
                if (data.title) {
                    const capitalizedTitle = data.title.charAt(0).toUpperCase() + data.title.slice(1);
                    document.title = `${capitalizedTitle} | Promptly AI`;
                }

                // If trigger is true, only 1 user msg, and not triggered yet
                if (shouldTriggerAI && uiMessages.length === 1 && uiMessages[0].role === 'user' && !hasTriggeredRef.current) {
                    hasTriggeredRef.current = true; // Mark as triggered
                    handleSendMessage(uiMessages[0].text, uiMessages[0].image || null, true);

                    // Replace URL to remove ?trigger=true without refreshing
                    window.history.replaceState(null, '', `/c/${id}`);
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

        // Reset Stop Ref
        isStoppedRef.current = false;

        // Setup Abort Controller
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        if (!isAutoTrigger) {
            const userMsg = { id: Date.now(), role: 'user', text, image };
            setMessages(prev => [...prev, userMsg]);
        }




        let status = "Thinking...";
        const lowerText = text.toLowerCase();
        if (image) status = "Analyzing Image...";
        else if (/(search|news|weather|price|stock|update|latest)/.test(lowerText)) status = "Searching Web...";
        else if (/(code|bug|error|fix|function|api)/.test(lowerText)) status = "Analyzing Code...";
        else if (/(resume|cv|ats)/.test(lowerText)) status = "Scanning Resume...";

        setStatusMessage(status);

        try {
            // Save User Message to DB
            if (chatId && session && !isAutoTrigger) {
                const saveRes = await fetch(`/api/chats/${chatId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'user', content: text, image }),
                });

                if (saveRes.ok) {
                    const saveData = await saveRes.json();
                    if (saveData.updatedTitle) document.title = `${saveData.updatedTitle} | Promptly AI`;
                    window.dispatchEvent(new CustomEvent('chatUpdated'));
                }
            }

            // Get AI Response
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: session ? messages : [], image }),
                signal: abortControllerRef.current.signal
            });

            const data = await response.json();

            setStatusMessage(null);


            const fullText = data.reply;
            const startTime = Date.now();
            const typingSpeed = 15;

            const aiMsgId = Date.now() + 1;
            setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: '' }]);

            while (true) {
                if (isStoppedRef.current) break;

                const now = Date.now();
                const elapsed = now - startTime;

                // Calculate how many chars should be visible by now
                const charCount = Math.floor(elapsed / typingSpeed);

                if (charCount >= fullText.length) {
                    setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: fullText } : msg));
                    break;
                }

                const currentText = fullText.slice(0, charCount);
                setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: currentText } : msg));

                // Use a short timeout for smooth animation
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            // Only save if NOT stopped
            if (chatId && session && !isStoppedRef.current) {
                try {
                    await fetch(`/api/chats/${chatId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role: 'ai', content: fullText }), // Save full text
                    });
                } catch (saveErr) {
                    console.error("Failed to save AI response:", saveErr);
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Fetch aborted');
                // Don't show error bubble for manual stop
            } else {
                console.error('Error:', error);
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: `Error: ${error.message || "I encountered an error."}` }]);
            }
        } finally {
            setIsGenerating(false);
            setStatusMessage(null);
            abortControllerRef.current = null;
        }
    };

    return (
        <>
            <ChatArea messages={messages} loading={statusMessage} scrollRef={scrollRef} />
            <InputArea onSend={handleSendMessage} loading={isGenerating} onStop={handleStop} />
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
