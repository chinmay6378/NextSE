'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

import { Sidebar } from '@/components/sidebar'
import { useAuth } from '@/lib/auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth()
  const pathname = usePathname()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 relative overflow-hidden">
        {/* Warm ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, oklch(0.618 0.195 38 / 0.07), transparent 70%)' }}
        />

        {/* Animated logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.75, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-2xl bg-orange-400/30 blur-xl scale-110" />
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-2xl">
            <img src="/icon.svg" alt="NextSE" className="w-full h-full object-cover" />
          </div>
        </motion.div>

        {/* Pulsing dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/50"
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.6, 1, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-[11px] font-medium text-muted-foreground tracking-widest uppercase"
        >
          Loading your workspace…
        </motion.p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Floating background orbs — absolute so they're clipped by h-screen */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Top-right: warm orange */}
        <motion.div
          animate={{ x: [0, 50, -30, 0], y: [0, -60, 35, 0], scale: [1, 1.2, 0.88, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full"
          style={{
            top: '-15%', right: '-8%',
            width: 600, height: 600,
            background: 'radial-gradient(circle at center, rgba(249,115,22,0.22) 0%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />
        {/* Bottom-left: violet */}
        <motion.div
          animate={{ x: [0, -40, 50, 0], y: [0, 50, -40, 0], scale: [1, 0.85, 1.18, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
          className="absolute rounded-full"
          style={{
            bottom: '-18%', left: '-8%',
            width: 560, height: 560,
            background: 'radial-gradient(circle at center, rgba(139,92,246,0.15) 0%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />
        {/* Center: emerald */}
        <motion.div
          animate={{ x: [0, 30, -45, 0], y: [0, -35, 55, 0], scale: [1, 1.14, 0.9, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 14 }}
          className="absolute rounded-full"
          style={{
            top: '30%', right: '20%',
            width: 440, height: 440,
            background: 'radial-gradient(circle at center, rgba(16,185,129,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Lower-right: soft orange */}
        <motion.div
          animate={{ x: [0, -25, 35, 0], y: [0, 35, -25, 0], scale: [1, 1.08, 0.94, 1] }}
          transition={{ duration: 23, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
          className="absolute rounded-full"
          style={{
            top: '58%', right: '-4%',
            width: 360, height: 360,
            background: 'radial-gradient(circle at center, rgba(251,146,60,0.14) 0%, transparent 70%)',
            filter: 'blur(55px)',
          }}
        />
      </div>

      <Sidebar />
      <main className="flex-1 pt-16 md:pt-0 min-w-0 overflow-y-auto relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="h-full p-5 md:p-8 max-w-[1200px] mx-auto w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
