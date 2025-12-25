'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import InputArea from '../components/InputArea';

function ChatContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

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

    // Redirect old URLs and set title
    useEffect(() => {
        document.title = 'Promptly AI - Smart Assistant';

        // Auto-Cleanup Trigger
        fetch('/api/cron/cleanup').catch(err => console.error("Cleanup trigger failed", err));

        // Save current visit time for next session
        if (session?.user) {
            localStorage.setItem('lastVisit', Date.now().toString());
        }
    }, [session?.user]);

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
    }, [session?.user?.name, pathname]); // Reset when route changes

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

    const [isSending, setIsSending] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const abortControllerRef = useRef(null);
    const isStoppedRef = useRef(false);

    // Cleanup abort controller on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        isStoppedRef.current = true;
        setIsGenerating(false);
        setStatusMessage(null);
        setIsSending(false);
    };

    const handleSendMessage = async (text = '', image = null) => {
        if (!text?.trim() && !image || isSending) return;

        isStoppedRef.current = false;

        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        setIsSending(true);

        setMessages(prev => [...prev, { id: 'initial', role: 'user', text, image }]);


        setIsGenerating(true);


        let status = "Thinking...";
        const lowerText = text.toLowerCase();
        if (image) status = "Analyzing Image...";
        else if (/(search|news|weather|price|stock|update|latest)/.test(lowerText)) status = "Searching Web...";
        else if (/(code|bug|error|fix|function|api)/.test(lowerText)) status = "Analyzing Code...";
        else if (/(resume|cv|ats)/.test(lowerText)) status = "Scanning Resume...";

        setStatusMessage(status);

        try {
            // 1. Check if user is logged in
            if (session) {
                /* ---------- Authenticated Flow (ChatGPT Style - No Reload) ---------- */

                // Create new chat and save message in background
                const createRes = await fetch('/api/chats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, image }),
                    signal: abortControllerRef.current.signal
                });

                if (createRes.ok) {
                    const newChat = await createRes.json();

                    // Update URL silently without page reload (ChatGPT pattern)
                    if (newChat.id) {
                        window.history.pushState(null, '', `/c/${newChat.id}`);
                        window.dispatchEvent(new CustomEvent('chatUpdated'));
                    }

                    // Fetch AI response and display on SAME page (no navigation)
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text, history: messages, image }),
                        signal: abortControllerRef.current.signal
                    });
                    const data = await response.json();

                    setStatusMessage(null);

                    // Typing animation
                    const fullText = data.reply;
                    const startTime = Date.now();
                    const typingSpeed = 15;

                    const aiMsgId = Date.now() + 1;
                    setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: '' }]);

                    while (true) {
                        if (isStoppedRef.current) break;

                        const now = Date.now();
                        const elapsed = now - startTime;
                        const charCount = Math.floor(elapsed / typingSpeed);

                        if (charCount >= fullText.length) {
                            setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: fullText } : msg));
                            break;
                        }

                        const currentText = fullText.slice(0, charCount);
                        setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: currentText } : msg));

                        await new Promise(resolve => setTimeout(resolve, 20));
                    }

                    // Save AI response to DB
                    if (newChat.id) {
                        await fetch(`/api/chats/${newChat.id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ role: 'ai', content: fullText }),
                        });
                    }
                }
            } else {
                /* ---------- Guest Flow (Not Logged In) ---------- */
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, history: [], image }),
                    signal: abortControllerRef.current.signal
                });
                const data = await response.json();




                const fullText = data.reply;
                const startTime = Date.now();
                const typingSpeed = 15;

                const aiMsgId = Date.now() + 1;
                setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: '' }]);

                while (true) {
                    if (isStoppedRef.current) break;

                    const now = Date.now();
                    const elapsed = now - startTime;
                    const charCount = Math.floor(elapsed / typingSpeed);

                    if (charCount >= fullText.length) {
                        setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: fullText } : msg));
                        break;
                    }

                    const currentText = fullText.slice(0, charCount);
                    setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: currentText } : msg));

                    await new Promise(resolve => setTimeout(resolve, 20));
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Fetch aborted');
            } else {
                console.error('Initial Send Error:', error);
                // Only show error if not redirected
                if (!session) {
                    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: `Error: ${error.message || "Failed."}` }]);
                }
            }
        } finally {
            setIsSending(false);
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
