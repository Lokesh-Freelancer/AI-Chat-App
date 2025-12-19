'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (res.error) {
                setError('Invalid credentials');
                return;
            }

            router.push('/');
            router.refresh();
        } catch (err) {
            console.log(err);
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
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Welcome Back</h2>
                {error && <div style={{ color: '#ff6b6b', marginBottom: '1rem' }}>{error}</div>}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                        style={{
                            padding: '0.8rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            backgroundColor: 'var(--primary-color)',
                            color: '#131314',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem',
                        }}
                    >
                        Login
                    </button>
                </form>
                <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Don't have an account? <Link href="/signup" style={{ color: 'var(--primary-color)' }}>Sign up</Link>
                </p>
            </div>
        </div>
    );
}
