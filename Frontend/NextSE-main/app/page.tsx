'use client'

import { AnimatePresence, motion, useInView, type Variants } from 'framer-motion'
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Cpu,
  GraduationCap,
  Menu,
  Mic,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/* ── Stagger helpers ── */
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}
const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

/* ── Feature data ── */
const features = [
  {
    icon: BookOpen,
    title: 'AI Study Materials',
    desc: 'Auto-generated client profiles, sales pitches, and flashcards tailored to each account.',
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'rgba(52,211,153,0.12)',
  },
  {
    icon: Target,
    title: 'Adaptive Assessments',
    desc: 'MCQ tests that adapt to your knowledge gaps and track progress over time.',
    gradient: 'from-indigo-400 to-blue-500',
    glow: 'rgba(99,102,241,0.12)',
  },
  {
    icon: Mic,
    title: 'Voice Coaching',
    desc: 'Practice live pitches against an AI prospect. Get scored on clarity, tone, and persuasion.',
    gradient: 'from-violet-400 to-purple-500',
    glow: 'rgba(167,139,250,0.12)',
  },
  {
    icon: BarChart2,
    title: 'Performance Analytics',
    desc: 'Visualise score trends, streaks, and skill breakdowns across every engineer.',
    gradient: 'from-orange-400 to-red-500',
    glow: 'rgba(251,146,60,0.12)',
  },
]

/* ── Stats ── */
const stats = [
  { value: '10×', label: 'Faster onboarding' },
  { value: '95%', label: 'Assessment accuracy' },
  { value: '3 min', label: 'To generate a full client brief' },
]

/* ── How it works steps ── */
const steps = [
  { num: '01', title: 'Add a client', desc: 'Upload reference docs and let AI build the complete profile.' },
  { num: '02', title: 'Study & prepare', desc: 'Engineers get personalised study materials and flashcards.' },
  { num: '03', title: 'Test your knowledge', desc: 'Adaptive MCQ sessions calibrated to real deal requirements.' },
  { num: '04', title: 'Practice the pitch', desc: 'Voice role-play against an AI prospect, then review your score.' },
]

/* ── Animated section wrapper ── */
function FadeSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && profile) {
      router.replace('/dashboard')
    }
  }, [profile, loading, router])

  if (loading || profile) return null

  return (
    <div className="min-h-screen bg-[oklch(0.990_0.003_60)] overflow-x-hidden">

      {/* ── Announcement bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full bg-foreground text-background flex items-center justify-center gap-3 py-2.5 px-4 text-sm"
      >
        <span className="inline-flex items-center gap-1.5 bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
          NEW
        </span>
        <span className="text-background/80 text-[13px]">
          NextSE v1.0 — AI voice coaching is now live
        </span>
        <Link href="/signup" className="flex items-center gap-0.5 text-[13px] font-semibold text-orange-400 hover:text-orange-300 transition-colors">
          Get started <ArrowRight size={13} />
        </Link>
      </motion.div>

      {/* ── Navigation ── */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="sticky top-0 z-50 bg-[oklch(0.990_0.003_60)]/90 backdrop-blur-md border-b border-black/6"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform">
              <img src="/icon.svg" alt="NextSE" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-[17px] text-foreground tracking-tight">NextSE</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {['Platform', 'How it works', 'Pricing'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="text-[14px] text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden md:inline-flex items-center text-[14px] font-medium text-foreground/70 hover:text-foreground transition-colors px-3 py-2"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-white px-4 py-2 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #f97316, #dc2626)',
                boxShadow: '0 4px 20px rgba(249,115,22,0.30)',
              }}
            >
              Get Started
              <ChevronRight size={14} />
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-black/6 bg-[oklch(0.990_0.003_60)] px-6 py-4 space-y-3 overflow-hidden"
            >
              {['Platform', 'How it works', 'Pricing'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1"
                >
                  {item}
                </a>
              ))}
              <div className="pt-2 flex flex-col gap-2">
                <Link href="/login" className="text-sm font-medium text-center py-2.5 rounded-xl border border-border text-foreground">Log in</Link>
                <Link href="/signup" className="text-sm font-semibold text-center py-2.5 rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}>Get Started</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── Hero ── */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* Background gradient wash (like sarvam.ai top glow) */}
        <div
          className="absolute top-0 inset-x-0 h-[560px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(249,115,22,0.13) 0%, rgba(220,38,38,0.06) 40%, transparent 70%)',
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 0%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 0%, transparent 100%)',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* Badge */}
            <motion.div variants={fadeUp} className="flex justify-center">
              <span className="inline-flex items-center gap-2 border border-black/10 bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-[13px] font-medium text-foreground/70 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI-Powered Sales Engineering Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-[52px] sm:text-[64px] md:text-[76px] font-bold tracking-tight leading-[1.05] text-foreground"
            >
              Train smarter.{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Close faster.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUp}
              className="text-[18px] text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              NextSE gives your sales engineering team AI-generated study materials, adaptive MCQ assessments, and live voice coaching — so every engineer walks into every deal prepared.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/signup"
                className="flex items-center gap-2 text-[15px] font-semibold text-white px-7 py-3.5 rounded-2xl transition-all hover:scale-[1.025] active:scale-[0.975]"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #dc2626)',
                  boxShadow: '0 8px 32px rgba(249,115,22,0.28)',
                }}
              >
                Start for free
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 text-[15px] font-medium text-foreground px-7 py-3.5 rounded-2xl border border-border bg-white hover:bg-muted/40 transition-all"
              >
                Log in
              </Link>
            </motion.div>

            {/* Social proof row */}
            <motion.div
              variants={fadeIn}
              className="pt-6 flex flex-wrap items-center justify-center gap-5"
            >
              {['No credit card required', 'Setup in 5 minutes', 'GDPR compliant'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero visual — product screenshot mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
            className="mt-16 relative mx-auto max-w-3xl"
          >
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-orange-500/10 via-transparent to-transparent blur-2xl" />
            <div className="relative rounded-2xl border border-black/10 shadow-2xl shadow-black/10 overflow-hidden bg-white">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-black/6 bg-[#f5f5f5]">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                <div className="flex-1 mx-4 h-6 rounded-lg bg-white border border-black/8 flex items-center px-3">
                  <span className="text-[11px] text-muted-foreground">nextse.app/dashboard</span>
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="p-6 bg-[oklch(0.990_0.003_60)]">
                {/* Top row metric cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Avg. Score', value: '84%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Tests Taken', value: '142', color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Clients Ready', value: '12', color: 'text-orange-600', bg: 'bg-orange-50' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} rounded-xl p-3.5 border border-black/5`}>
                      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
                      <p className={`text-[22px] font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                {/* Content rows */}
                <div className="space-y-2">
                  {[70, 55, 85, 45].map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 opacity-20 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 rounded bg-black/6" style={{ width: `${w}%` }} />
                        <div className="h-2 rounded bg-black/4" style={{ width: `${w - 20}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="platform" className="py-14 border-y border-black/6 bg-white">
        <FadeSection className="max-w-4xl mx-auto px-6 grid grid-cols-3 divide-x divide-black/6">
          {stats.map(({ value, label }) => (
            <motion.div key={label} variants={fadeUp} className="text-center px-8 py-2">
              <p
                className="text-[42px] sm:text-[52px] font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #dc2626)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </motion.div>
          ))}
        </FadeSection>
      </section>

      {/* ── Features ── */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <FadeSection className="text-center mb-14 space-y-3">
          <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Everything you need
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-[38px] font-bold tracking-tight text-foreground">
            One platform for the full SE journey
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground max-w-xl mx-auto text-[16px]">
            From onboarding to closing, NextSE equips your team with AI at every step.
          </motion.p>
        </FadeSection>

        <FadeSection className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, desc, gradient, glow }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              whileHover={{ y: -3, boxShadow: `0 20px 48px ${glow}` }}
              className="group relative rounded-2xl border border-black/7 bg-white p-7 transition-all duration-300 overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(circle at 30% 30%, ${glow}, transparent 70%)` }}
              />
              <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              <h3 className="relative text-[16px] font-bold text-foreground mb-2">{title}</h3>
              <p className="relative text-[14px] text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </FadeSection>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 bg-white border-y border-black/6">
        <div className="max-w-5xl mx-auto px-6">
          <FadeSection className="text-center mb-16 space-y-3">
            <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-orange-500">
              Simple by design
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-[38px] font-bold tracking-tight text-foreground">
              How NextSE works
            </motion.h2>
          </FadeSection>

          <FadeSection className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ num, title, desc }, i) => (
              <motion.div key={num} variants={fadeUp} className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-[calc(100%-12px)] w-full h-px bg-gradient-to-r from-black/10 to-transparent z-0" />
                )}
                <div className="relative z-10 flex flex-col gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}
                  >
                    {num}
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] text-foreground mb-1.5">{title}</h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </FadeSection>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-24 max-w-4xl mx-auto px-6">
        <FadeSection>
          <motion.div
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden p-12 text-center"
            style={{
              background: 'linear-gradient(135deg, oklch(0.48 0.19 38), oklch(0.32 0.16 15))',
            }}
          >
            {/* Orbs */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #fb923c, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />
            {/* Dot grid */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-xl overflow-hidden">
                  <img src="/icon.svg" alt="NextSE" className="w-full h-full" />
                </div>
                <span className="font-bold text-[22px] text-white">NextSE</span>
              </div>
              <h2 className="text-[34px] sm:text-[42px] font-bold text-white leading-tight">
                Ready to build your<br />best sales engineers?
              </h2>
              <p className="text-white/60 text-[16px] max-w-lg mx-auto">
                Get your team set up in minutes. No contracts, no complexity.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/signup"
                  className="flex items-center gap-2 text-[15px] font-semibold text-foreground bg-white px-8 py-3.5 rounded-2xl hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                >
                  Start for free
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2 text-[15px] font-medium text-white/70 px-8 py-3.5 rounded-2xl border border-white/20 hover:text-white hover:border-white/40 transition-all"
                >
                  Log in to your account
                </Link>
              </div>
            </div>
          </motion.div>
        </FadeSection>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-black/6 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden">
              <img src="/icon.svg" alt="NextSE" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-[15px] text-foreground">NextSE</span>
          </div>
          <p className="text-[13px] text-muted-foreground/60">
            © {new Date().getFullYear()} NextSE. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {['Privacy', 'Terms', 'Contact'].map((item) => (
              <a key={item} href="#" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
