'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Lock,
  Mail,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const features = [
  {
    icon: BookOpen,
    title: 'AI Study Materials',
    desc: 'Auto-generated profiles, pitch decks & flashcards',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    icon: Target,
    title: 'Adaptive Assessments',
    desc: 'MCQ tests calibrated to your knowledge gaps',
    gradient: 'from-indigo-400 to-blue-500',
  },
  {
    icon: BarChart2,
    title: 'Performance Analytics',
    desc: 'Track score trends, streaks, and skill breakdowns',
    gradient: 'from-violet-400 to-purple-500',
  },
]

/* Stagger variants */
const pageContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}
const fadeLeft = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(false)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      setSuccess(true)
      toast.success('Welcome back!')
      setTimeout(() => router.push('/dashboard'), 700)
    } catch (err) {
      setError(true)
      toast.error(err instanceof Error ? err.message : 'Login failed')
      setTimeout(() => setError(false), 700)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Left brand panel — warm orange-red gradient ── */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex flex-col justify-between w-[460px] shrink-0 relative overflow-hidden p-12"
        style={{
          background: 'linear-gradient(145deg, oklch(0.48 0.19 38), oklch(0.32 0.16 15), oklch(0.18 0.08 280))',
        }}
      >
        {/* Decorative blur orbs */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #fb923c, transparent 70%)' }}
        />
        <div
          className="absolute bottom-16 left-0 w-64 h-64 rounded-full blur-3xl opacity-18 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8B5CF6, transparent 70%)' }}
        />

        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Logo */}
        <motion.div
          variants={pageContainer}
          initial="hidden"
          animate="show"
          className="relative z-10"
        >
          <motion.div variants={fadeLeft} className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="relative w-10 h-10 shrink-0"
            >
              <div className="absolute inset-0 rounded-xl bg-white/20 blur-md scale-110" />
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/30 backdrop-blur-sm">
                <img src="/icon.svg" alt="NextSE" className="w-full h-full object-cover" />
              </div>
            </motion.div>
            <div>
              <span className="font-bold text-[16px] text-white tracking-tight block">NextSE</span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-white/45">
                Sales Engineering
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Hero text + features */}
        <motion.div
          className="relative z-10 space-y-8"
          variants={pageContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp}>
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-white/80">AI-Powered Sales Training</span>
            </div>

            <h2 className="text-[36px] font-bold text-white leading-[1.18] tracking-tight">
              Master every<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #FCD34D 0%, #FB923C 50%, #F472B6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                sales conversation
              </span>
            </h2>
            <p className="text-white/45 text-sm leading-relaxed mt-3">
              Study smarter, test faster, and pitch with confidence using your AI training co-pilot.
            </p>
          </motion.div>

          {/* Feature list */}
          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc, gradient }, i) => (
              <motion.div
                key={title}
                variants={fadeLeft}
                transition={{ delay: 0.38 + i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 mt-0.5 shadow-lg`}
                >
                  <Icon size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/92">{title}</p>
                  <p className="text-xs text-white/38 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="relative z-10 text-white/22 text-xs"
        >
          © {new Date().getFullYear()} NextSE. All rights reserved.
        </motion.p>
      </motion.div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative bg-background">
        {/* Ambient glow */}
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ background: 'radial-gradient(circle, oklch(0.618 0.195 38 / 0.06), transparent 70%)' }}
        />

        <motion.div
          className="w-full max-w-[380px] relative z-10"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shrink-0">
              <img src="/icon.svg" alt="NextSE" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-[15px] text-foreground">NextSE</span>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              /* Success state */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center justify-center text-center py-12"
              >
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                  <div className="relative w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-foreground">Welcome back!</p>
                <p className="text-sm text-muted-foreground mt-1">Taking you to your dashboard…</p>
              </motion.div>
            ) : (
              /* Login form */
              <motion.div key="form">
                <h1 className="text-[28px] font-bold text-foreground tracking-tight mb-1.5">
                  Welcome back
                </h1>
                <p className="text-sm text-muted-foreground mb-8">
                  Sign in to continue your training journey
                </p>

                <motion.form
                  onSubmit={handleLogin}
                  className="space-y-4"
                  animate={error ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.45 }}
                >
                  {/* Email */}
                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Email Address
                    </label>
                    <div
                      className={cn(
                        'relative flex items-center rounded-xl border transition-all duration-200',
                        focused === 'email'
                          ? 'border-primary/60 bg-primary/3 ring-3 ring-primary/10'
                          : 'border-border bg-muted/40 hover:border-muted-foreground/40',
                      )}
                    >
                      <Mail className="absolute left-3.5 w-4 h-4 text-muted-foreground shrink-0" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused(null)}
                        placeholder="you@company.com"
                        className="w-full pl-10 pr-4 py-3 bg-transparent text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </motion.div>

                  {/* Password */}
                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.33, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Password
                    </label>
                    <div
                      className={cn(
                        'relative flex items-center rounded-xl border transition-all duration-200',
                        focused === 'password'
                          ? 'border-primary/60 bg-primary/3 ring-3 ring-primary/10'
                          : 'border-border bg-muted/40 hover:border-muted-foreground/40',
                      )}
                    >
                      <Lock className="absolute left-3.5 w-4 h-4 text-muted-foreground shrink-0" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocused('password')}
                        onBlur={() => setFocused(null)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-transparent text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </motion.div>

                  {/* Submit */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.41, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.018, boxShadow: '0 10px 36px oklch(0.618 0.195 38 / 0.32)' }}
                      whileTap={{ scale: 0.975 }}
                      className="w-full mt-2 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-55 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, oklch(0.618 0.195 38), oklch(0.540 0.210 15))',
                        boxShadow: '0 6px 28px oklch(0.618 0.195 38 / 0.26)',
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {isSubmitting ? (
                          <motion.span
                            key="loading"
                            className="flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing in…
                          </motion.span>
                        ) : (
                          <motion.span
                            key="idle"
                            className="flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            Sign In
                            <ArrowRight className="w-4 h-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>
                </motion.form>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="mt-7 text-center text-sm text-muted-foreground"
                >
                  New to the platform?{' '}
                  <Link
                    href="/signup"
                    className="text-primary font-semibold hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
                  >
                    Create an account
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.p>

                {/* Trust badges */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.65 }}
                  className="mt-8 flex items-center justify-center gap-5"
                >
                  {['End-to-End Encrypted', 'SOC 2 Ready', 'GDPR'].map((badge) => (
                    <span
                      key={badge}
                      className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider"
                    >
                      {badge}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
