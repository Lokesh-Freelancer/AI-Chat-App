'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({ onSelectChat, currentChatId }) {
    const { data: session, status } = useSession();
    const [chats, setChats] = useState([]);
    const [editingChatId, setEditingChatId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [hoveredChatId, setHoveredChatId] = useState(null);
    const editInputRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        if (status === 'authenticated') {
            fetchChats();
        }
    }, [status]);

    useEffect(() => {
        if (editingChatId && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingChatId]);

    const fetchChats = async () => {
        try {
            const res = await fetch('/api/chats');
            if (res.ok) {
                const data = await res.json();
                setChats(data);
            }
        } catch (err) {
            console.error("Failed to load chats");
        }
    };

    const handleNewChat = async () => {
        if (!session) {
            router.push('/');
            return;
        }

        try {
            const res = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: '' }), // Empty message for initial creation
            });

            if (res.ok) {
                const newChat = await res.json();
                fetchChats(); // Refresh list
                router.push(`/c/${newChat.id}`);
            } else {
                router.push('/');
            }
        } catch (err) {
            console.error("Failed to create instant chat");
            router.push('/');
        }
    };

    const startEditing = (e, chat) => {
        e.stopPropagation();
        setEditingChatId(chat.id);
        setEditValue(chat.title);
    };

    const cancelEditing = () => {
        setEditingChatId(null);
        setEditValue('');
    };

    const saveEditing = async (chatId) => {
        if (!editValue.trim()) return cancelEditing();

        // Optimistic update
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: editValue } : c));
        setEditingChatId(null);

        try {
            await fetch(`/api/chats/${chatId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editValue })
            });
        } catch (err) {
            console.error("Failed to rename chat");
            fetchChats(); // Revert on error
        }
    };

    const handleKeyDown = (e, chatId) => {
        if (e.key === 'Enter') {
            saveEditing(chatId);
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    const confirmDelete = async (e, chatId) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this chat?")) return;

        // Optimistic delete
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (currentChatId === chatId) {
            onSelectChat(null);
            router.push('/');
        }

        try {
            const res = await fetch(`/api/chats/${chatId}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                throw new Error('Failed to delete chat on server');
            }
        } catch (err) {
            console.error("Failed to delete chat:", err);
            // Revert on failure
            fetchChats();
            alert("Could not delete chat. The server might be blocking it because of existing messages. Please sync the database.");
        }
    };

    // Group chats by date
    const groupedChats = {
        Today: [],
        Yesterday: [],
        Older: []
    };

    chats.forEach(chat => {
        const date = new Date(chat.updatedAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            groupedChats.Today.push(chat);
        } else if (date.toDateString() === yesterday.toDateString()) {
            groupedChats.Yesterday.push(chat);
        } else {
            groupedChats.Older.push(chat);
        }
    });

    if (status === 'loading') {
        return (
            <aside style={{ height: '100%', width: '260px', backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--border-color)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '40px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', marginBottom: '20px', opacity: 0.5 }}></div>
                <div style={{ height: '20px', width: '60%', backgroundColor: 'var(--surface-color)', borderRadius: '4px', marginBottom: '10px', opacity: 0.5 }}></div>
                <div style={{ height: '20px', width: '80%', backgroundColor: 'var(--surface-color)', borderRadius: '4px', marginBottom: '10px', opacity: 0.5 }}></div>
            </aside>
        );
    }

    return (
        <aside style={{
            height: '100%',
            width: '260px',
            backgroundColor: 'var(--sidebar-bg)',
            display: 'flex',
            flexDirection: 'column',
            padding: '10px',
            borderRight: '1px solid var(--border-color)',
            transition: 'width 0.3s ease',
            flexShrink: 0
        }}>
            {/* Brand Logo */}
            <div style={{ padding: '15px 10px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#131314', fontWeight: 'bold', fontSize: '1.2rem' }}>P</div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Promptly AI</h1>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div
                    onClick={handleNewChat}
                    style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        flex: 1,
                        marginRight: '10px',
                        transition: 'background 0.2s'
                    }}
                    className="new-chat-btn"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <span style={{ fontSize: '1.2rem' }}>+</span> New Chat
                </div>
                <ThemeToggle />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 5px' }}>
                {!session ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p style={{ marginBottom: '10px' }}>Log in to save chat history.</p>
                        <Link href="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Login</Link>
                    </div>
                ) : (
                    Object.entries(groupedChats).map(([label, list]) => (
                        list.length > 0 && (
                            <div key={label} style={{ marginBottom: '20px' }}>
                                <p style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    padding: '0 10px 8px',
                                    textTransform: 'uppercase'
                                }}>{label}</p>
                                {list.map(chat => (
                                    <div
                                        key={chat.id}
                                        onClick={() => router.push(`/c/${chat.id}`)}
                                        onMouseEnter={() => setHoveredChatId(chat.id)}
                                        onMouseLeave={() => setHoveredChatId(null)}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            color: 'var(--text-main)',
                                            fontSize: '0.9rem',
                                            backgroundColor: currentChatId === chat.id ? 'var(--surface-color)' : 'transparent',
                                            marginBottom: '4px',
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            minHeight: '40px'
                                        }}
                                    >
                                        {editingChatId === chat.id ? (
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={() => saveEditing(chat.id)}
                                                onKeyDown={(e) => handleKeyDown(e, chat.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    width: '100%',
                                                    padding: '4px',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--primary-color)',
                                                    backgroundColor: 'var(--input-bg)',
                                                    color: 'var(--text-main)',
                                                    fontSize: '0.9rem',
                                                    outline: 'none'
                                                }}
                                            />
                                        ) : (
                                            <>
                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, paddingRight: '10px' }}>
                                                    {chat.title}
                                                </div>

                                                {/* Action Icons - Visible on hover or when active */}
                                                {(hoveredChatId === chat.id || currentChatId === chat.id) && (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={(e) => startEditing(e, chat)}
                                                            title="Rename"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={(e) => confirmDelete(e, chat.id)}
                                                            title="Delete"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    ))
                )}
            </div>

            {session && (
                <div style={{
                    padding: '15px 10px',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    {session.user.image ? (
                        <img src={session.user.image} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                            {session.user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.name}</div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                            <Link href={`/profile?chatId=${currentChatId || ''}`} style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Profile</Link>
                            <span style={{ color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => signOut()}>Logout</span>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
