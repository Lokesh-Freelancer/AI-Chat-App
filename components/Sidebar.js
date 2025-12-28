'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, useParams, usePathname } from 'next/navigation';
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
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isHeaderHovered, setIsHeaderHovered] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const editInputRef = useRef(null);
    const searchInputRef = useRef(null);
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const currentChatId = params.chatId;


    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
        const handleMobileToggle = () => setIsMobileOpen(prev => !prev);

        window.addEventListener('chatUpdated', handleUpdate);
        window.addEventListener('toggleMobileSidebar', handleMobileToggle);

        return () => {
            window.removeEventListener('chatUpdated', handleUpdate);
            window.removeEventListener('toggleMobileSidebar', handleMobileToggle);
        };
    }, [status]);

    // Keyboard shortcut for search (Ctrl+K / Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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

    const handleNewChat = () => {
        if (!session) {
            router.push('/');
            return;
        }

        // 1. Check if a truly empty "New Chat" exists (0 messages) to reuse it
        const existingEmptyChat = chats.find(c => c.title === "New Chat" && c._count?.messages === 0);
        if (existingEmptyChat) {
            // Only navigate if we're not already on this chat
            if (pathname !== `/c/${existingEmptyChat.id}`) {
                router.push(`/c/${existingEmptyChat.id}`);
            }
            if (isMobileOpen) setIsMobileOpen(false);
            return;
        }

        // 2. If no empty chat, just go to Home Page (Draft Mode)
        // Only navigate if we're not already on home page
        if (pathname !== '/') {
            router.push('/');
        }
        if (isMobileOpen) setIsMobileOpen(false);
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


        setChats(prev => prev.filter(c => c.id !== chatId));
        if (currentChatId === chatId) {
            router.push('/');
        }
        if (isMobileOpen) setIsMobileOpen(false);

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


    // Filter chats based on search query
    const filteredChats = chats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedChats = {
        Today: [],
        Yesterday: [],
        Older: []
    };

    filteredChats.forEach(chat => {
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


    const showCollapsed = isCollapsed && !isMobile;

    if (status === 'loading') {
        return (
            <aside style={{ height: '100%', width: showCollapsed ? '70px' : '260px', backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--border-color)', padding: showCollapsed ? '10px 5px' : '20px', display: 'flex', flexDirection: 'column', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div style={{ height: '40px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', marginBottom: '20px', opacity: 0.2 }}></div>
                <div style={{ height: '20px', width: '60%', backgroundColor: 'var(--surface-color)', borderRadius: '4px', marginBottom: '10px', opacity: 0.2 }}></div>
            </aside>
        );
    }

    if (status === 'unauthenticated') {
        return null;
    }

    return (
        <>

            <div
                className={`mobile-overlay ${isMobileOpen ? 'active' : ''}`}
                onClick={() => setIsMobileOpen(false)}
            />

            <aside
                className={isMobileOpen ? 'mobile-open' : ''}
                style={{
                    height: '100%',
                    width: showCollapsed ? '70px' : '260px',
                    backgroundColor: 'var(--sidebar-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '10px',
                    borderRight: '1px solid var(--border-color)',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0,
                    overflowX: showCollapsed ? 'visible' : 'hidden',
                    position: 'relative',
                    zIndex: 100
                }}
            >

                <div
                    onMouseEnter={() => setIsHeaderHovered(true)}
                    onMouseLeave={() => setIsHeaderHovered(false)}
                    style={{
                        padding: '10px 5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: showCollapsed ? 'center' : 'space-between',
                        marginBottom: '15px',
                        minHeight: '48px',
                        position: 'relative'
                    }}
                >
                    {showCollapsed ? (
                        <div style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Link href="/" style={{ display: 'contents' }}>
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
                            </Link>

                            <button
                                onClick={toggleSidebar}
                                className="sidebar-toggle"
                                data-tooltip="Expand Sidebar"
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
                            <Link href="/" onClick={() => setIsMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, textDecoration: 'none', cursor: 'pointer' }}>
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
                            </Link>

                            <button
                                onClick={toggleSidebar}
                                className="sidebar-toggle"
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
                                    display: isMobile ? 'none' : 'flex'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <line x1="9" y1="3" x2="9" y2="21" />
                                    <path d="M15 15l-3-3 3-3" />
                                </svg>
                            </button>

                            {/* Mobile Close Button */}
                            <button
                                onClick={() => setIsMobileOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s, color 0.2s',
                                    display: isMobile ? 'flex' : 'none'
                                }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
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
                    {session && (
                        <>
                            <div
                                onClick={handleNewChat}
                                data-tooltip={showCollapsed ? "New chat" : undefined}
                                style={{
                                    padding: showCollapsed ? '10px' : '12px 14px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: showCollapsed ? 'center' : 'flex-start',
                                    gap: '12px',
                                    color: 'var(--text-main)',
                                    fontSize: '0.95rem',
                                    fontWeight: '500',
                                    width: showCollapsed ? '44px' : '100%',
                                    height: showCollapsed ? '44px' : 'auto',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                className="new-chat-btn-hover"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                {!showCollapsed && <span>New chat</span>}
                            </div>

                            {/* Search Input */}
                            {!showCollapsed && (
                                <div style={{ marginTop: '12px', width: '100%', position: 'relative' }}>
                                    <div style={{ position: 'relative' }}>
                                        {/* Search Icon */}
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="var(--text-secondary)"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{
                                                position: 'absolute',
                                                left: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                pointerEvents: 'none'
                                            }}
                                        >
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="m21 21-4.35-4.35"></path>
                                        </svg>

                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="Search chats..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 36px 10px 36px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)',
                                                backgroundColor: 'var(--input-bg)',
                                                color: 'var(--text-main)',
                                                fontSize: '0.9rem',
                                                outline: 'none',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                                        />

                                        {/* Clear Button */}
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                style={{
                                                    position: 'absolute',
                                                    right: '8px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '4px',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-color)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 5px', display: showCollapsed ? 'none' : 'block' }}>
                    {!session ? (
                        !showCollapsed && (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <p style={{ marginBottom: '10px' }}>Log in to save chat history.</p>
                                <Link href="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Login</Link>
                            </div>
                        )
                    ) : filteredChats.length === 0 && searchQuery ? (
                        // Empty state when search has no results
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: 'var(--text-secondary)'
                        }}>
                            <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                    margin: '0 auto 16px',
                                    opacity: 0.5
                                }}
                            >
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>No chats found</p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Try a different search term</p>
                        </div>
                    ) : (
                        Object.entries(groupedChats).map(([label, list]) => (
                            list.length > 0 && (
                                <div key={label} style={{ marginBottom: '20px' }}>
                                    {!showCollapsed && (
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
                                            onClick={() => {
                                                router.push(`/c/${chat.id}`);
                                                if (isMobileOpen) setIsMobileOpen(false);
                                            }}
                                            onMouseEnter={() => setHoveredChatId(chat.id)}
                                            onMouseLeave={() => setHoveredChatId(null)}
                                            data-tooltip={showCollapsed ? chat.title : undefined}
                                            className="chat-item-hover"
                                            style={{
                                                padding: showCollapsed ? '10px' : '10px 14px',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                color: 'var(--text-main)',
                                                fontSize: '0.9rem',
                                                backgroundColor: currentChatId === chat.id ? 'var(--surface-color)' : 'transparent',
                                                marginBottom: '4px',
                                                position: 'relative',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: showCollapsed ? 'center' : 'space-between',
                                                minHeight: '40px',
                                            }}
                                        >
                                            {showCollapsed ? (
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
                                                            {chat.title.charAt(0).toUpperCase() + chat.title.slice(1)}
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
                    <div style={{
                        marginTop: 'auto',
                        borderTop: showCollapsed ? 'none' : '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: showCollapsed ? 'column' : 'row',
                        alignItems: 'center',
                        padding: '15px 10px',
                        gap: showCollapsed ? '15px' : '12px',
                    }}>

                        <div style={{ position: 'relative', flex: 1 }}>
                            <div
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                data-tooltip={showCollapsed ? session.user.name : undefined}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: showCollapsed ? 'center' : 'flex-start',
                                    gap: '12px',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    minWidth: 0
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-color)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {session.user.image ? (
                                    <img src={session.user.image} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
                                ) : (
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
                                        {session.user.name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                {!showCollapsed && (
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.name}</div>
                                    </div>
                                )}
                            </div>

                            {/* Profile Popup Menu */}
                            {showProfileMenu && (
                                <>
                                    <div onClick={() => setShowProfileMenu(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                                    <div style={{ position: 'absolute', bottom: '100%', left: showCollapsed ? '0' : '10px', transform: 'none', marginBottom: '10px', width: showCollapsed ? '280px' : 'calc(100% - 20px)', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)', zIndex: 1000, overflow: 'hidden' }}>
                                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {session.user.image ? (
                                                    <img src={session.user.image} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top' }} />
                                                ) : (
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                                        {session.user.name?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.name}</div>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.email}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ padding: '8px' }}>
                                            <Link href="/settings" onClick={() => { setShowProfileMenu(false); setIsMobileOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.9rem', transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--input-bg)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                                Settings
                                            </Link>
                                            <div onClick={() => { setShowProfileMenu(false); signOut(); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--input-bg)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                                Log out
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                    </div>
                )}
            </aside>
        </>
    );
}
