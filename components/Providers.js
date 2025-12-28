'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import ClientThemeHandler from './ClientThemeHandler';

export default function Providers({ children }) {
    return (
        <SessionProvider>
            <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
                <ClientThemeHandler />
                {children}
            </ThemeProvider>
        </SessionProvider>
    );
}
