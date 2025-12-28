'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Registration complete! Logging you in...');

                // Auto-login
                const result = await signIn('credentials', {
                    redirect: false,
                    email,
                    password,
                });

                if (result?.error) {
                    toast.error('Auto-login failed. Please log in manually.');
                    router.push('/login');
                } else {
                    toast.success('Welcome to Promptly AI!');
                    router.push('/');
                }
            } else {
                setError(data.error);
                toast.error(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Something went wrong');
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-main)',
        }}>
            <div style={{
                maxWidth: '400px',
                width: '100%',
                padding: '2rem',
                backgroundColor: 'var(--surface-color)',
                borderRadius: '1rem',
                border: '1px solid var(--border-color)',
            }}>
                <h1 style={{ marginBottom: '0.5rem', fontSize: '1.8rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--primary-color)' }}>Promptly AI</h1>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Create Account</h2>
                {error && <div style={{ color: '#ff6b6b', marginBottom: '1rem' }}>{error}</div>}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                            padding: '0.8rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text-main)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                            padding: '0.8rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text-main)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                            padding: '0.8rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text-main)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.8rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            backgroundColor: 'var(--primary-color)',
                            color: '#131314',
                            fontWeight: 'bold',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>
                <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Already have an account? <Link href="/login" style={{ color: 'var(--primary-color)' }}>Log in</Link>
                </p>
            </div>
        </div>
    );
}
