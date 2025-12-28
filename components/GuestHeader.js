'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function GuestHeader() {
    const { status } = useSession();
    const pathname = usePathname();

    // Only show for unauthenticated users
    if (status !== 'unauthenticated') {
        return null;
    }

    // Don't show on login/signup pages to avoid clutter/duplication
    if (pathname === '/login' || pathname === '/signup') {
        return null;
    }

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            backgroundColor: 'var(--bg-color)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            zIndex: 100,
            backdropFilter: 'blur(12px)',
        }}>
            {/* Left: Logo & Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <img
                        src="/logo.png"
                        alt="Promptly AI Logo"
                        style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                    />
                    <span style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: 'var(--text-main)',
                        letterSpacing: '-0.01em'
                    }}>
                        Promptly AI
                    </span>
                </Link>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Link href="/login">
                    <button style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid transparent',
                        backgroundColor: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                    }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-color)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        Log in
                    </button>
                </Link>

                <Link href="/signup">
                    <button style={{
                        padding: '8px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'var(--primary-color)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                    }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                        Sign up for free
                    </button>
                </Link>
            </div>
        </header>
    );
}
