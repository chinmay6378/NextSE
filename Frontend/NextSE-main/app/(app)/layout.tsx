'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

import { Sidebar } from '@/components/sidebar'
import { useAuth } from '@/lib/auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth()
  const pathname = usePathname()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Middleware already redirects unauthenticated requests to /login; this just
    // avoids a one-frame flash of protected content while that happens.
    return null
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-full p-4 md:p-8 max-w-7xl mx-auto w-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
