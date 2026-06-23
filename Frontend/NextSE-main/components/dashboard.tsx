'use client'

import { motion } from 'framer-motion'
import {
  BarChart2,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardList,
  Flame,
  Mic,
  TrendingUp,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

import { useAuth } from '@/lib/auth'

/* ── Motion helpers ── */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] } },
}

const chartData = [
  { date: 'Mon', score: 65 },
  { date: 'Tue', score: 72 },
  { date: 'Wed', score: 68 },
  { date: 'Thu', score: 78 },
  { date: 'Fri', score: 85 },
  { date: 'Sat', score: 88 },
  { date: 'Sun', score: 92 },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/* ── Sarvam-style two-column section ── */
function Section({
  title,
  subtitle,
  cta,
  ctaHref,
  children,
}: {
  title: string
  subtitle: string
  cta?: string
  ctaHref?: string
  children: React.ReactNode
}) {
  return (
    <motion.div variants={item} className="flex flex-col md:flex-row gap-6 md:gap-14">
      {/* Left: heading + CTA */}
      <div className="md:w-56 shrink-0">
        <h2 className="text-[19px] font-bold text-foreground leading-snug tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{subtitle}</p>
        {cta && ctaHref && (
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-foreground border border-border rounded-full px-4 py-1.5 hover:border-foreground hover:bg-muted transition-all duration-200 group"
          >
            {cta}
            <motion.span
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronRight size={14} />
            </motion.span>
          </Link>
        )}
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0 space-y-2">{children}</div>
    </motion.div>
  )
}

/* ── Sarvam-style list card ── */
function SarvamCard({
  gradient,
  icon: Icon,
  title,
  subtitle,
  href,
  badge,
}: {
  gradient: string
  icon: typeof BarChart2
  title: string
  subtitle: string
  href?: string
  badge?: string
}) {
  const inner = (
    <motion.div
      whileHover={{ x: 5, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.99 }}
      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border hover:border-muted-foreground/30 hover:bg-muted/40 transition-all duration-200 group cursor-pointer"
    >
      {/* Gradient circle — Sarvam style */}
      <motion.div
        whileHover={{ scale: 1.08, rotate: 5 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}
      >
        <Icon size={20} className="text-white" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      {badge && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          {badge}
        </span>
      )}

      <ChevronRight
        size={15}
        className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0"
      />
    </motion.div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}

/* ── Chart tooltip ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3.5 py-2.5 shadow-xl text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-primary text-base">{payload[0].value}%</p>
    </div>
  )
}

export function Dashboard() {
  const { profile } = useAuth()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <motion.div
      className="space-y-10 max-w-4xl"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ── Greeting ── */}
      <motion.div variants={item}>
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="text-3xl font-bold text-foreground mt-0.5 tracking-tight">
          Welcome, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Here&apos;s your NextSE snapshot for today.
        </p>
      </motion.div>

      {/* ── Section 1: Learning ── */}
      <Section
        title="Build Your Sales Expertise"
        subtitle="AI-generated study materials, adaptive tests, and live pitch practice for every client scenario."
        cta="Start Studying"
        ctaHref="/study"
      >
        <SarvamCard
          gradient="from-emerald-400 to-teal-500"
          icon={BookOpen}
          title="Study Hub"
          subtitle="Browse AI-curated modules, flashcards & cheat-sheets"
          href="/study"
        />
        <SarvamCard
          gradient="from-indigo-400 to-blue-500"
          icon={ClipboardList}
          title="Take an Assessment"
          subtitle="Adaptive MCQ tests mapped to your client profiles"
          href="/test"
        />
        <SarvamCard
          gradient="from-violet-400 to-purple-500"
          icon={Mic}
          title="Voice Practice"
          subtitle="Rehearse pitches and objection handling"
          href="/test"
        />
      </Section>

      <hr className="border-border" />

      {/* ── Section 2: Performance ── */}
      <Section
        title="Your Performance"
        subtitle="Live metrics across all training modules and assessments."
        cta="View Full Results"
        ctaHref="/results"
      >
        <SarvamCard
          gradient="from-orange-400 to-amber-500"
          icon={CheckCircle2}
          title="12 Tests Completed"
          subtitle="+2 this week"
          badge="+2 new"
        />
        <SarvamCard
          gradient="from-red-400 to-orange-500"
          icon={Flame}
          title="7-Day Study Streak"
          subtitle="Keep it going! 🔥"
        />
        <SarvamCard
          gradient="from-emerald-400 to-green-500"
          icon={TrendingUp}
          title="82% Average Score"
          subtitle="+3% improvement this week"
          badge="↑ 3%"
        />
        <SarvamCard
          gradient="from-indigo-400 to-blue-500"
          icon={Zap}
          title="Top 25% of Engineers"
          subtitle="Keep pushing to reach the top 10%"
        />
      </Section>

      <hr className="border-border" />

      {/* ── Section 3: Weekly chart + activity ── */}
      <Section title="Weekly Progress" subtitle="Assessment score trends over the past 7 days.">
        {/* Chart card */}
        <motion.div
          variants={item}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={15} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Score Trend</span>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <TrendingUp size={10} />
              +27 pts this week
            </span>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.006 60)" />
              <XAxis
                dataKey="date"
                stroke="transparent"
                tick={{ fontSize: 11, fill: 'oklch(0.50 0.012 260)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="transparent"
                tick={{ fontSize: 11, fill: 'oklch(0.50 0.012 260)' }}
                axisLine={false}
                tickLine={false}
                domain={[50, 100]}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'oklch(0.91 0.006 60)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#f97316"
                strokeWidth={2.5}
                fill="url(#scoreGrad)"
                dot={{ fill: '#f97316', r: 3.5, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#f97316', stroke: 'white', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent activity list — Sarvam card style */}
        <motion.div
          variants={item}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Recent Activity</p>
          </div>
          {[
            {
              icon: CheckCircle2,
              gradient: 'from-emerald-400 to-teal-500',
              text: 'Completed MCQ: Objection Handling',
              time: '2h ago',
            },
            {
              icon: BookOpen,
              gradient: 'from-indigo-400 to-blue-500',
              text: 'Studied: Discovery Questions Module',
              time: '5h ago',
            },
            {
              icon: Mic,
              gradient: 'from-violet-400 to-purple-500',
              text: 'Voice Session — scored 87%',
              time: 'Yesterday',
            },
          ].map((act, i) => {
            const Icon = act.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-none hover:bg-muted/30 transition-colors"
              >
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${act.gradient} flex items-center justify-center shrink-0`}
                >
                  <Icon size={14} className="text-white" />
                </div>
                <p className="flex-1 text-sm text-foreground truncate">{act.text}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <Clock size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{act.time}</span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </Section>
    </motion.div>
  )
}
