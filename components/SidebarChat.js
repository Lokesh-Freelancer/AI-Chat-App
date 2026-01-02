'use client';

import { useState, useRef, useEffect } from 'react';

export default function SidebarChat({
    chat,
    isActive,
    isCollapsed,
    isEditing,
    editValue,
    onEditChange,
    onEditSubmit,
    onEditCancel,
    onRenameClick,
    onDeleteClick,
    onChatClick
}) {
    const [isHovered, setIsHovered] = useState(false);
    const editInputRef = useRef(null);

    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [isEditing]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onEditSubmit();
        } else if (e.key === 'Escape') {
            onEditCancel();
        }
    };

    return (
        <div
            onClick={onChatClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            data-tooltip={isCollapsed ? chat.title : undefined}
            className={`chat-item ${isCollapsed ? 'collapsed' : 'expanded'} ${isActive ? 'active' : ''}`}
        >
            {isCollapsed ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: isActive ? 1 : 0.6 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            ) : (
                isEditing ? (
                    <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => onEditChange(e.target.value)}
                        onBlur={onEditSubmit}
                        onKeyDown={handleKeyDown}
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

                        {(isHovered || isActive) && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRenameClick(); }}
                                    title="Rename"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
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
    );
}
