'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Sidebar() {
    const { data: session, status } = useSession();
    const [chats, setChats] = useState([]);
    const [editingChatId, setEditingChatId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [hoveredChatId, setHoveredChatId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHeaderHovered, setIsHeaderHovered] = useState(false);
    const editInputRef = useRef(null);
    const router = useRouter();
    const params = useParams();
    const currentChatId = params.chatId;

    // Load/Save collapsed state
    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved !== null) setIsCollapsed(JSON.parse(saved));
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
    };

    useEffect(() => {
        if (status === 'authenticated') {
            fetchChats();
        }

        const handleUpdate = () => fetchChats();
        window.addEventListener('chatUpdated', handleUpdate);
        return () => window.removeEventListener('chatUpdated', handleUpdate);
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

        // Check if an empty "New Chat" already exists
        const existingEmptyChat = chats.find(c => c.title === "New Chat");
        if (existingEmptyChat) {
            router.push(`/c/${existingEmptyChat.id}`);
            return;
        }

        if (isCreating) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: '' }), // Empty message for initial creation
            });

            if (res.ok) {
                const newChat = await res.json();
                window.dispatchEvent(new CustomEvent('chatUpdated'));
                router.push(`/c/${newChat.id}`);
            } else {
                router.push('/');
            }
        } catch (err) {
            console.error("Failed to create instant chat");
            router.push('/');
        } finally {
            setIsCreating(false);
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
            <aside style={{ height: '100%', width: isCollapsed ? '70px' : '260px', backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--border-color)', padding: isCollapsed ? '10px 5px' : '20px', display: 'flex', flexDirection: 'column', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div style={{ height: '40px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', marginBottom: '20px', opacity: 0.2 }}></div>
                <div style={{ height: '20px', width: '60%', backgroundColor: 'var(--surface-color)', borderRadius: '4px', marginBottom: '10px', opacity: 0.2 }}></div>
            </aside>
        );
    }

    return (
        <aside style={{
            height: '100%',
            width: isCollapsed ? '70px' : '260px',
            backgroundColor: 'var(--sidebar-bg)',
            display: 'flex',
            flexDirection: 'column',
            padding: '10px',
            borderRight: '1px solid var(--border-color)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0,
            overflowX: 'hidden'
        }}>
            {/* Header with Logo and Toggle */}
            <div
                onMouseEnter={() => setIsHeaderHovered(true)}
                onMouseLeave={() => setIsHeaderHovered(false)}
                style={{
                    padding: '10px 5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    marginBottom: '15px',
                    minHeight: '48px',
                    position: 'relative'
                }}
            >
                {isCollapsed ? (
                    <div style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Logo - Hide on Hover */}
                        <img
                            src="/logo.png"
                            alt="Logo"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                flexShrink: 0,
                                opacity: isHeaderHovered ? 0 : 1,
                                visibility: isHeaderHovered ? 'hidden' : 'visible',
                                transition: 'opacity 0.2s ease, visibility 0.2s',
                                position: 'absolute'
                            }}
                        />
                        {/* Toggle Icon - Show on Hover */}
                        <button
                            onClick={toggleSidebar}
                            className="sidebar-toggle"
                            title="Expand Sidebar"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: isHeaderHovered ? 1 : 0,
                                visibility: isHeaderHovered ? 'visible' : 'hidden',
                                transition: 'opacity 0.2s ease, visibility 0.2s',
                                position: 'absolute',
                                width: '100%',
                                height: '100%'
                            }}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                                <path d="M12 15l3-3-3-3" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <img
                                src="/logo.png"
                                alt="Logo"
                                style={{ width: '30px', height: '30px', borderRadius: '6px', flexShrink: 0 }}
                            />
                            <h1 style={{
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                color: 'var(--text-main)',
                                margin: 0,
                                whiteSpace: 'nowrap'
                            }}>
                                Promptly AI
                            </h1>
                        </div>

                        <button
                            onClick={toggleSidebar}
                            className="sidebar-toggle"
                            title="Collapse Sidebar"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.2s, color 0.2s',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                                <path d="M15 15l-3-3 3-3" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '0 5px'
            }}>
                <div
                    onClick={handleNewChat}
                    title={isCollapsed ? "New chat" : ""}
                    style={{
                        padding: isCollapsed ? '10px' : '12px 14px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '12px',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        width: isCollapsed ? '44px' : '100%',
                        height: isCollapsed ? '44px' : 'auto',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    className="new-chat-btn-hover"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    {!isCollapsed && <span>New chat</span>}
                </div>
                {!isCollapsed && (
                    <div style={{ marginTop: '12px', width: '100%' }}>
                        <ThemeToggle />
                    </div>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 5px', display: isCollapsed ? 'none' : 'block' }}>
                {!session ? (
                    !isCollapsed && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <p style={{ marginBottom: '10px' }}>Log in to save chat history.</p>
                            <Link href="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Login</Link>
                        </div>
                    )
                ) : (
                    Object.entries(groupedChats).map(([label, list]) => (
                        list.length > 0 && (
                            <div key={label} style={{ marginBottom: '20px' }}>
                                {!isCollapsed && (
                                    <p style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        padding: '0 10px 8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>{label}</p>
                                )}
                                {list.map(chat => (
                                    <div
                                        key={chat.id}
                                        onClick={() => router.push(`/c/${chat.id}`)}
                                        onMouseEnter={() => setHoveredChatId(chat.id)}
                                        onMouseLeave={() => setHoveredChatId(null)}
                                        title={isCollapsed ? chat.title : ""}
                                        className="chat-item-hover"
                                        style={{
                                            padding: isCollapsed ? '10px' : '10px 14px',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            color: 'var(--text-main)',
                                            fontSize: '0.9rem',
                                            backgroundColor: currentChatId === chat.id ? 'var(--surface-color)' : 'transparent',
                                            marginBottom: '4px',
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: isCollapsed ? 'center' : 'space-between',
                                            minHeight: '40px',
                                        }}
                                    >
                                        {isCollapsed ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: currentChatId === chat.id ? 1 : 0.6 }}>
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                        ) : (
                                            editingChatId === chat.id ? (
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

                                                    {(hoveredChatId === chat.id || currentChatId === chat.id) && (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                onClick={(e) => startEditing(e, chat)}
                                                                title="Rename"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={(e) => confirmDelete(e, chat.id)}
                                                                title="Delete"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    ))
                )}
            </div>

            {session && (
                <div
                    title={isCollapsed ? session.user.name : ""}
                    style={{
                        padding: '15px 10px',
                        borderTop: isCollapsed ? 'none' : '1px solid var(--border-color)',
                        marginTop: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '12px'
                    }}
                >
                    {session.user.image ? (
                        <img src={session.user.image} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
                            {session.user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                    {!isCollapsed && (
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.name}</div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                                <Link href={`/profile?chatId=${currentChatId || ''}`} style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textDecoration: 'none' }} className="hover-link">Profile</Link>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }} className="hover-link" onClick={() => signOut()}>Logout</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
}
