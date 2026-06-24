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
        url: 'https://nextse.b2botix.ai/image.png',
        width: 1200,
        height: 630,
        alt: 'NextSE Dashboard',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NextSE',
    description: 'AI-powered Sales Engineering training — study smarter, assess faster, pitch with confidence.',
    images: ['https://nextse.b2botix.ai/image.png'],
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
