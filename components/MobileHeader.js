'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function MobileHeader() {
    const { status } = useSession();

    if (status === 'unauthenticated') {
        return null;
    }

    return (
        <div className="mobile-header">
            <div className="mobile-header-content">
                {status === 'authenticated' && (
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('toggleMobileSidebar'))}
                        className="mobile-hamburger-btn"
                        aria-label="Open Menu"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                )}
                <Link href="/" className="mobile-header-logo" style={{ textDecoration: 'none', marginLeft: status === 'authenticated' ? '0' : '0' }}>
                    <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
                    <span className="mobile-app-name">Promptly AI</span>
                </Link>
                {status === 'authenticated' && <div style={{ width: '44px' }}></div>}
            </div>
        </div>
    );
}
