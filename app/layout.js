import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#131314' },
  ],
  interactiveWidget: 'resizes-content',
};

export const metadata = {
  metadataBase: new URL('https://promptly-ai.vercel.app'),

  title: {
    default: 'Promptly AI – Gemini-Powered AI Chat Assistant',
    template: '%s | Promptly AI',
  },

  description:
    'Promptly AI is a fast, secure Gemini-powered AI chat assistant for coding, writing, reasoning, and productivity. A powerful ChatGPT alternative with history, dark mode, and code highlighting.',

  keywords: [
    'AI chat assistant',
    'Gemini AI chat',
    'ChatGPT alternative',
    'AI coding assistant',
    'AI chatbot web app',
    'Promptly AI',
    'free AI chat',
    'AI for developers',
  ],

  authors: [{ name: 'Lokesh Prajapati' }],
  creator: 'Promptly AI',

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },

  alternates: {
    canonical: '/',
  },

  openGraph: {
    type: 'website',
    url: '/',
    title: 'Promptly AI – Gemini-Powered AI Chat Assistant',
    description:
      'Chat smarter with Promptly AI. Gemini-powered AI assistant for coding, writing, and productivity.',
    siteName: 'Promptly AI',
    locale: 'en_US',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Promptly AI – Gemini AI Chat Assistant',
    description:
      'Fast, secure, and powerful AI chat assistant built with Gemini.',
    creator: '@lokesh',
  },

  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/icon.png' }],
  },
};

import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Providers from '@/components/Providers';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';

import GuestHeader from '@/components/GuestHeader';

import { Toaster } from 'sonner';

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <Providers session={session}>
          <div className="layout-container" style={{ display: 'flex', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
            <Toaster position="top-center" richColors theme="system" />
            {session && <Sidebar />}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <GuestHeader />
              <MobileHeader />
              {children}
            </main>
          </div>
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Promptly AI",
              applicationCategory: "AIApplication",
              operatingSystem: "Web",
              description:
                "Gemini-powered AI chat assistant for coding, writing, and productivity.",
              url: "https://promptly-ai.vercel.app",
              author: {
                "@type": "Person",
                name: "Lokesh Prajapati",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
