'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import ClientThemeHandler from './ClientThemeHandler';

export default function Providers({ children, session }) {
    return (
        <SessionProvider session={session}>
            <ThemeProvider
                attribute="data-theme"
                defaultTheme="dark"
                enableSystem={false}
                forcedTheme={!session ? "light" : undefined}
            >
                {!session ? null : <ClientThemeHandler />}
                {children}
            </ThemeProvider>
        </SessionProvider>
    );
}
