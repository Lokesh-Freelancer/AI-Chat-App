import './globals.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#131314' },
  ],
};

export const metadata = {
  metadataBase: new URL('https://promptly-ai.vercel.app'), // Replace with actual domain
  title: {
    default: 'Promptly AI - Smart Assistant',
    template: '%s | Promptly AI',
  },
  description: 'Experience the future of communication with Promptly AI. Powered by advanced Gemini models, featuring code highlighting, persistent history, and a beautiful dark mode UI.',
  keywords: ['AI', 'Chat', 'Gemini', 'Promptly AI', 'Assistant'],
  authors: [{ name: 'Lokesh' }],
  creator: 'Promptly AI Team',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Promptly AI - Your Intelligent Companion',
    description: 'Chat with consistency. Save your history. Generate code. All in one premium interface.',
    siteName: 'Promptly AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Promptly AI - Smart Assistant',
    description: 'Experience the future of communication with advanced AI.',
    creator: '@lokesh',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

import Providers from '@/components/Providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
