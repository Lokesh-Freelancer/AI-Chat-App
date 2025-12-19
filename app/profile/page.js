'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ProfileContent() {
    const { data: session, update } = useSession();
    const [name, setName] = useState('');
    const [image, setImage] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const returnChatId = searchParams.get('chatId');

    const handleBack = () => {
        // Ensure we don't pass 'undefined' or 'null' as string
        if (returnChatId && returnChatId !== 'null' && returnChatId !== 'undefined') {
            router.push(`/?chatId=${returnChatId}`);
        } else {
            router.push('/');
        }
    };

    useEffect(() => {
        if (session?.user) {
            setName(session.user.name || '');
            setImage(session.user.image || '');
        }
    }, [session]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus('');

        try {
            const res = await fetch('/api/user/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, image }),
            });

            if (res.ok) {
                setStatus('success');
                // Update session client-side
                await update({ name, image });
                setTimeout(() => setStatus(''), 3000);
            } else {
                setStatus('error');
            }
        } catch (err) {
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return (
            <div style={{
                height: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-main)',
                overflowY: 'auto'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '20px' }}>Please log in to view your profile.</p>
                    <Link href="/login" style={{ color: 'var(--primary-color)' }}>Go to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh',
            width: '100%',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-main)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto'
        }}>
            <div style={{ width: '100%', maxWidth: '500px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                    <button
                        onClick={handleBack}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            padding: 0
                        }}
                    >
                        ← Back to Chat
                    </button>
                </div>

                <div style={{
                    backgroundColor: 'var(--sidebar-bg)',
                    padding: '30px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        {image ? (
                            <img src={image} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px', border: '2px solid var(--border-color)' }} />
                        ) : (
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: '#fff', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                                {name?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Edit Profile</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Update your personal information</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: 'var(--input-bg)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-main)',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.2s',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>Avatar URL</label>
                            <input
                                type="text"
                                value={image}
                                onChange={(e) => setImage(e.target.value)}
                                placeholder="https://example.com/avatar.jpg"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: 'var(--input-bg)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-main)',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.2s',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px' }}>Paste a direct link to an image (e.g., from Imgur or GitHub).</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '12px',
                                backgroundColor: 'var(--primary-color)',
                                color: '#fff', // Always white for contrast on blue
                                border: 'none',
                                borderRadius: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '1rem',
                                marginTop: '10px',
                                opacity: loading ? 0.7 : 1,
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>

                        {status === 'success' && (
                            <div style={{ padding: '10px', backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem' }}>
                                Profile updated successfully!
                            </div>
                        )}
                        {status === 'error' && (
                            <div style={{ padding: '10px', backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#f44336', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem' }}>
                                Failed to update profile. Please try again.
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>
                Loading Profile...
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}
