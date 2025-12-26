'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { compressImage } from '@/lib/imageUtils';
import { toast } from 'sonner';

export default function SettingsPage() {
    const { data: session, update, status } = useSession();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [name, setName] = useState('');
    const [image, setImage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [chatCount, setChatCount] = useState(0);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (session) {
            setName(session.user?.name || '');
            setImage(session.user?.image || '');
        }

        // Fetch chat count
        if (session) {
            fetch('/api/chats')
                .then(res => res.json())
                .then(data => setChatCount(data.length))
                .catch(err => console.error(err));
        }
    }, [session, status, router]);

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = async () => {
                // Compress image to reduce size (200x200, 70% quality)
                const compressed = await compressImage(reader.result, 200, 200, 0.7);
                console.log('Original size:', reader.result.length, 'Compressed size:', compressed.length);
                setImage(compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        console.log('Saving profile with:', { name, image: image?.substring(0, 50) + '...' });

        try {
            const res = await fetch('/api/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, image })
            });

            const data = await res.json();
            console.log('API Response:', data);

            if (res.ok) {
                console.log('Updating session with DB data:', { name: data.user.name, image: data.user.image?.substring(0, 50) + '...' });

                // Update session with new data from database response
                await update({
                    name: data.user.name,
                    image: data.user.image
                });

                console.log('Session updated, UI refreshed');

                toast.success('Profile updated successfully!');
            } else {
                toast.error('Failed to update profile: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportChats = async () => {
        try {
            const res = await fetch('/api/chats/export');
            const data = await res.json();

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `promptly-chats-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export chats:', error);
            toast.error('Failed to export chats');
        }
    };

    const handleClearAllChats = async () => {
        try {
            const res = await fetch('/api/chats/all', { method: 'DELETE' });
            if (res.ok) {
                setChatCount(0);
                setShowClearConfirm(false);
                toast.success('All chats cleared successfully!');
                window.dispatchEvent(new CustomEvent('chatUpdated'));
            }
        } catch (error) {
            console.error('Failed to clear chats:', error);
            toast.error('Failed to clear chats');
        }
    };

    if (!session) return null;

    return (
        <div style={{
            width: '100%',
            height: '100vh',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-main)',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div className="settings-header">
                <Link href="/" style={{
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                    transition: 'color 0.2s'
                }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Chat
                </Link>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>Settings</h1>
            </div>

            {/* Content */}
            <div className="settings-container">
                {/* Profile Section */}
                <Section title="👤 Profile">
                    <SettingRow label="Profile Picture">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div
                                style={{ position: 'relative', cursor: 'pointer', group: 'avatar' }}
                                onClick={() => document.getElementById('profile-image-upload').click()}
                                onMouseEnter={(e) => {
                                    const overlay = e.currentTarget.querySelector('.avatar-overlay');
                                    if (overlay) overlay.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    const overlay = e.currentTarget.querySelector('.avatar-overlay');
                                    if (overlay) overlay.style.opacity = '0';
                                }}
                            >
                                {image ? (
                                    <img
                                        src={image}
                                        alt="Profile"
                                        style={{
                                            width: '96px',
                                            height: '96px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            objectPosition: 'top',
                                            border: '4px solid var(--surface-color)',
                                            boxShadow: '0 0 0 2px var(--border-color)'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '96px',
                                        height: '96px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--primary-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        fontSize: '2.5rem',
                                        border: '4px solid var(--surface-color)',
                                        boxShadow: '0 0 0 2px var(--border-color)'
                                    }}>
                                        {name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}

                                {/* Hover Overlay */}
                                <div
                                    className="avatar-overlay"
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0,
                                        transition: 'opacity 0.2s',
                                        border: '4px solid transparent'
                                    }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <circle cx="12" cy="13" r="4"></circle>
                                    </svg>
                                    <span style={{ color: 'white', fontSize: '0.75rem', marginTop: '4px', fontWeight: '500' }}>Edit</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Click the image to upload a new photo.
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                    JPG, GIF or PNG. Max size of 800K
                                </span>
                            </div>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                                id="profile-image-upload"
                            />
                        </div>
                    </SettingRow>
                    <SettingRow label="Name">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem',
                                width: '100%',
                                maxWidth: '300px'
                            }}
                        />
                    </SettingRow>
                    <SettingRow label="Email">
                        <span style={{ color: 'var(--text-secondary)' }}>{session.user?.email}</span>
                    </SettingRow>
                    <div style={{ marginTop: '16px' }}>
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSaving || (name === session.user?.name && image === session.user?.image)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                                cursor: isSaving || (name === session.user?.name && image === session.user?.image) ? 'not-allowed' : 'pointer',
                                opacity: isSaving || (name === session.user?.name && image === session.user?.image) ? 0.5 : 1
                            }}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </Section>

                {/* Preferences Section */}
                <Section title="🎨 Preferences">
                    <SettingRow label="Theme">
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </SettingRow>
                </Section>

                {/* Data & Privacy Section */}
                <Section title="📊 Data & Privacy">
                    <SettingRow label="Chat History">
                        <span style={{ color: 'var(--text-secondary)' }}>{chatCount} chats</span>
                    </SettingRow>
                    <SettingRow label="Export Data">
                        <button
                            onClick={handleExportChats}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-color)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            Download Chats (JSON)
                        </button>
                    </SettingRow>
                    <SettingRow label="Clear All Chats">
                        {!showClearConfirm ? (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #dc2626',
                                    backgroundColor: 'transparent',
                                    color: '#dc2626',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#dc2626';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#dc2626';
                                }}
                            >
                                Clear All
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleClearAllChats}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Confirm Delete
                                </button>
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-main)',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </SettingRow>
                </Section>

                {/* About Section */}
                <Section title="ℹ️ About">
                    <SettingRow label="Version">
                        <span style={{ color: 'var(--text-secondary)' }}>1.0.0</span>
                    </SettingRow>
                    <SettingRow label="Developer">
                        <span style={{ color: 'var(--text-secondary)' }}>Lokesh Prajapati</span>
                    </SettingRow>
                </Section>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{
            marginBottom: '32px',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-color)'
        }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '20px' }}>{title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {children}
            </div>
        </div>
    );
}

function SettingRow({ label, children }) {
    return (
        <div className="settings-row">
            <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{label}</span>
            <div>{children}</div>
        </div>
    );
}
