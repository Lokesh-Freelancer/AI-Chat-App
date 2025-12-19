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
  metadataBase: new URL('https://your-chat-domain.com'), // Replace with actual domain
  title: {
    default: 'AI Chat App - Smart Assistant',
    template: '%s | AI Chat App',
  },
  description: 'Experience the future of communication with our Premium AI Chat App. Powered by advanced Gemini models, featuring code highlighting, persistent history, and a beautiful dark mode UI.',
  keywords: ['AI', 'Chat', 'Gemini', 'Artificial Intelligence', 'Coding Assistant', 'Next.js', 'Premium UI'],
  authors: [{ name: 'Your Name' }],
  creator: 'Your Team',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'AI Chat App - Your Intelligent Companion',
    description: 'Chat with consistency. Save your history. Generate code. All in one premium interface.',
    siteName: 'AI Chat App',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Chat App - Smart Assistant',
    description: 'Experience the future of communication with advanced AI.',
    creator: '@yourhandle',
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
