import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth'
import { QueryProvider } from '@/lib/query-client'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'NextSE',
  description: 'AI-powered Sales Engineering training — study smarter, assess faster, pitch with confidence.',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'NextSE',
    description: 'AI-powered Sales Engineering training — study smarter, assess faster, pitch with confidence.',
    url: 'https://nextse.b2botix.ai',
    siteName: 'NextSE',
    images: [
      {
        url: 'https://nextse.b2botix.ai/apple-icon.png',
        width: 180,
        height: 180,
        alt: 'NextSE Logo',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'NextSE',
    description: 'AI-powered Sales Engineering training — study smarter, assess faster, pitch with confidence.',
    images: ['https://nextse.b2botix.ai/apple-icon.png'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster theme="light" position="bottom-right" />
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
