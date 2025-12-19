'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';

export default function Providers({ children }) {
    return (
        <SessionProvider>
            <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
                {children}
            </ThemeProvider>
        </SessionProvider>
    );
}
