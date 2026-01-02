'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';

export default function ClientThemeHandler() {
    const { status } = useSession();
    const { setTheme } = useTheme();

    useEffect(() => {
        if (status === 'authenticated') {
            setTheme('dark');
        }
    }, [status]);

    return null;
}
