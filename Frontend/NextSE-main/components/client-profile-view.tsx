'use client'

import { useRef, useState } from 'react'
import {
  AlertTriangle, Award, BookOpen, Building2, Calendar,
  ChevronDown, ChevronUp, DollarSign, Package, Rocket,
  Shield, Target, TrendingUp, Users, ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './markdown-renderer'

// ─── Section config ───────────────────────────────────────────────────────────

interface SectionCfg {
  key: string
  num: number
  title: string
  shortTitle: string
  icon: React.ElementType
  navBg: string; navBorder: string; navText: string
  cardBorder: string; headerBg: string
  badgeBg: string; badgeText: string
  iconBg: string; iconText: string
  accentBar: string
}

const SECTIONS: SectionCfg[] = [
  {
    key: 'company_snapshot', num: 1, title: 'Company Snapshot', shortTitle: 'Company',
    icon: Building2,
    navBg: 'bg-blue-500/10', navBorder: 'border-blue-500/25', navText: 'text-blue-300',
    cardBorder: 'border-blue-500/20', headerBg: 'bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent',
    badgeBg: 'bg-blue-500/20', badgeText: 'text-blue-300',
    iconBg: 'bg-blue-500/20', iconText: 'text-blue-400',
    accentBar: 'bg-blue-500',
  },
  {
    key: 'offer_and_products', num: 2, title: 'Offer & Products', shortTitle: 'Products',
    icon: Package,
    navBg: 'bg-violet-500/10', navBorder: 'border-violet-500/25', navText: 'text-violet-300',
    cardBorder: 'border-violet-500/20', headerBg: 'bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent',
    badgeBg: 'bg-violet-500/20', badgeText: 'text-violet-300',
    iconBg: 'bg-violet-500/20', iconText: 'text-violet-400',
    accentBar: 'bg-violet-500',
  },
  {
    key: 'ideal_buyer_profile', num: 3, title: 'Ideal Buyer Profile', shortTitle: 'Ideal Buyer',
    icon: Target,
    navBg: 'bg-emerald-500/10', navBorder: 'border-emerald-500/25', navText: 'text-emerald-300',
    cardBorder: 'border-emerald-500/20', headerBg: 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent',
    badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300',
    iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-400',
    accentBar: 'bg-emerald-500',
  },
  {
    key: 'buyer_committee', num: 4, title: 'Buyer Committee', shortTitle: 'Committee',
    icon: Users,
    navBg: 'bg-orange-500/10', navBorder: 'border-orange-500/25', navText: 'text-orange-300',
    cardBorder: 'border-orange-500/20', headerBg: 'bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent',
    badgeBg: 'bg-orange-500/20', badgeText: 'text-orange-300',
    iconBg: 'bg-orange-500/20', iconText: 'text-orange-400',
    accentBar: 'bg-orange-500',
  },
  {
    key: 'competitor_intelligence', num: 5, title: 'Competitor Intelligence', shortTitle: 'Competitors',
    icon: Shield,
    navBg: 'bg-red-500/10', navBorder: 'border-red-500/25', navText: 'text-red-300',
    cardBorder: 'border-red-500/20', headerBg: 'bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent',
    badgeBg: 'bg-red-500/20', badgeText: 'text-red-300',
    iconBg: 'bg-red-500/20', iconText: 'text-red-400',
    accentBar: 'bg-red-500',
  },
  {
    key: 'sales_playbook', num: 6, title: 'Sales Playbook', shortTitle: 'Playbook',
    icon: BookOpen,
    navBg: 'bg-cyan-500/10', navBorder: 'border-cyan-500/25', navText: 'text-cyan-300',
    cardBorder: 'border-cyan-500/20', headerBg: 'bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent',
    badgeBg: 'bg-cyan-500/20', badgeText: 'text-cyan-300',
    iconBg: 'bg-cyan-500/20', iconText: 'text-cyan-400',
    accentBar: 'bg-cyan-500',
  },
  {
    key: 'demand_and_timing', num: 7, title: 'Demand & Timing', shortTitle: 'Timing',
    icon: Calendar,
    navBg: 'bg-amber-500/10', navBorder: 'border-amber-500/25', navText: 'text-amber-300',
    cardBorder: 'border-amber-500/20', headerBg: 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent',
    badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-300',
    iconBg: 'bg-amber-500/20', iconText: 'text-amber-400',
    accentBar: 'bg-amber-500',
  },
  {
    key: 'commercial_overview', num: 8, title: 'Commercial Overview', shortTitle: 'Commercial',
    icon: DollarSign,
    navBg: 'bg-green-500/10', navBorder: 'border-green-500/25', navText: 'text-green-300',
    cardBorder: 'border-green-500/20', headerBg: 'bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent',
    badgeBg: 'bg-green-500/20', badgeText: 'text-green-300',
    iconBg: 'bg-green-500/20', iconText: 'text-green-400',
    accentBar: 'bg-green-500',
  },
  {
    key: 'credibility_assets', num: 9, title: 'Credibility Assets', shortTitle: 'Credibility',
    icon: Award,
    navBg: 'bg-indigo-500/10', navBorder: 'border-indigo-500/25', navText: 'text-indigo-300',
    cardBorder: 'border-indigo-500/20', headerBg: 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent',
    badgeBg: 'bg-indigo-500/20', badgeText: 'text-indigo-300',
    iconBg: 'bg-indigo-500/20', iconText: 'text-indigo-400',
    accentBar: 'bg-indigo-500',
  },
  {
    key: 'strategy_and_focus', num: 10, title: 'Strategy & Focus', shortTitle: 'Strategy',
    icon: Rocket,
    navBg: 'bg-pink-500/10', navBorder: 'border-pink-500/25', navText: 'text-pink-300',
    cardBorder: 'border-pink-500/20', headerBg: 'bg-gradient-to-r from-pink-500/10 via-pink-500/5 to-transparent',
    badgeBg: 'bg-pink-500/20', badgeText: 'text-pink-300',
    iconBg: 'bg-pink-500/20', iconText: 'text-pink-400',
    accentBar: 'bg-pink-500',
  },
  {
    key: 'watchlist_director_notes', num: 11, title: 'Watchlist / Director Notes', shortTitle: 'Watchlist',
    icon: AlertTriangle,
    navBg: 'bg-red-600/10', navBorder: 'border-red-600/30', navText: 'text-red-400',
    cardBorder: 'border-red-600/30', headerBg: 'bg-gradient-to-r from-red-600/15 via-red-600/5 to-transparent',
    badgeBg: 'bg-red-600/20', badgeText: 'text-red-300',
    iconBg: 'bg-red-600/20', iconText: 'text-red-400',
    accentBar: 'bg-red-600',
  },
]

// ─── Visual diagrams ──────────────────────────────────────────────────────────

function BuyerCommitteeTree() {
  const tiers = [
    {
      label: 'Initiates Requirement',
      sub: 'Spots the need, raises indent',
      emoji: '📋',
      bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', text: 'text-yellow-200',
    },
    {
      label: 'Technical Evaluator',
      sub: 'Reviews specs & quality',
      emoji: '⚙️',
      bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-200',
    },
    {
      label: 'Final Decision Maker',
      sub: 'Signs off & releases PO',
      emoji: '✅',
      bg: 'bg-green-500/10', border: 'border-green-500/25', text: 'text-green-200',
    },
  ]

  return (
    <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-4 mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/60 mb-4">
        Decision Hierarchy
      </p>

      {/* Vertical chain */}
      <div className="flex flex-col items-center gap-0 max-w-xs mx-auto">
        {tiers.map((tier, i) => (
          <div key={i} className="flex flex-col items-center w-full">
            <div className={cn('flex items-center gap-3 px-4 py-2.5 rounded-xl border w-full', tier.bg, tier.border)}>
              <span className="text-lg shrink-0">{tier.emoji}</span>
              <div>
                <p className={cn('text-xs font-semibold', tier.text)}>{tier.label}</p>
                <p className="text-[10px] text-muted-foreground">{tier.sub}</p>
              </div>
            </div>
            {i < tiers.length - 1 && (
              <div className="flex flex-col items-center my-0.5">
                <div className="w-0.5 h-3 bg-orange-500/30" />
                <ArrowDown size={10} className="text-orange-500/40" />
                <div className="w-0.5 h-1 bg-orange-500/30" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Blocker row */}
      <div className="flex items-center gap-2 mt-4 max-w-xs mx-auto">
        <div className="flex-1 h-px bg-red-500/25" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/25 bg-red-500/10">
          <span className="text-sm">⛔</span>
          <div>
            <p className="text-[11px] font-semibold text-red-300">Deal Blocker</p>
            <p className="text-[10px] text-muted-foreground">Can veto at any stage</p>
          </div>
        </div>
        <div className="flex-1 h-px bg-red-500/25" />
      </div>

      <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
        Map each role to the actual contact before outreach
      </p>
    </div>
  )
}

function SalesFunnel() {
  const stages = [
    { label: 'Lead Sources', pct: 100, color: 'bg-cyan-500/40 text-cyan-200' },
    { label: 'First Contact', pct: 84, color: 'bg-cyan-500/35 text-cyan-200' },
    { label: 'Technical Discussion', pct: 68, color: 'bg-cyan-500/28 text-cyan-200' },
    { label: 'Commercial Negotiation', pct: 52, color: 'bg-cyan-500/22 text-cyan-200' },
    { label: 'PO Closure', pct: 38, color: 'bg-cyan-500/16 text-cyan-100' },
    { label: 'Repeat Order', pct: 26, color: 'bg-cyan-500/10 text-cyan-100' },
  ]

  return (
    <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4 mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/60 mb-4">
        Sales Pipeline Stages
      </p>
      <div className="flex flex-col items-center gap-1">
        {stages.map((stage, i) => (
          <div
            key={i}
            style={{ width: `${stage.pct}%` }}
            className={cn(
              'flex items-center justify-center rounded-lg py-1.5 px-2 text-[11px] font-medium transition-all',
              stage.color
            )}
          >
            {stage.label}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
        Refer to content below for exact drop-off reasons
      </p>
    </div>
  )
}

function DemandTimingStrip() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const quarters = [
    { label: 'Q1', months: [0, 1, 2] },
    { label: 'Q2', months: [3, 4, 5] },
    { label: 'Q3', months: [6, 7, 8] },
    { label: 'Q4', months: [9, 10, 11] },
  ]

  return (
    <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/60 mb-3">
        Annual Demand Calendar
      </p>

      {/* Quarter groups */}
      <div className="grid grid-cols-4 gap-2">
        {quarters.map((q) => (
          <div key={q.label} className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold text-amber-400/60 text-center">{q.label}</p>
            <div className="flex gap-1">
              {q.months.map((mi) => (
                <div
                  key={mi}
                  className="flex-1 rounded-md bg-amber-500/10 border border-amber-500/20 py-2 flex items-center justify-center"
                >
                  <span className="text-[9px] font-medium text-amber-300/70 rotate-0">{months[mi]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500/50 border border-amber-500/30" />
          <span className="text-[10px] text-muted-foreground">Peak buying</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-muted/30 border border-border/40" />
          <span className="text-[10px] text-muted-foreground">Slow period</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-center mt-1">
        Peak & slow months are detailed in the content below
      </p>
    </div>
  )
}

function CommercialMetricGrid() {
  const metrics = [
    { label: 'Order Value', icon: '💰', hint: 'Avg order range (₹)' },
    { label: 'Gross Margin', icon: '📈', hint: 'Best segment margin %' },
    { label: 'Conversion', icon: '🎯', hint: 'Enquiry-to-closure rate' },
    { label: 'Payment Terms', icon: '📅', hint: 'Days / advance / credit' },
    { label: 'Repeat Frequency', icon: '🔁', hint: 'How often they reorder' },
    { label: 'Capacity', icon: '🏭', hint: 'Production headroom' },
  ]

  return (
    <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-4 mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-green-400/60 mb-3">
        Commercial Snapshot
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-1 rounded-lg bg-green-500/10 border border-green-500/20 p-2.5 text-center">
            <span className="text-lg">{m.icon}</span>
            <p className="text-[10px] font-semibold text-green-300">{m.label}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">{m.hint}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
        Actual figures from documents are in the content below
      </p>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  cfg,
  content,
  divRef,
}: {
  cfg: SectionCfg
  content: string
  divRef: (el: HTMLDivElement | null) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const Icon = cfg.icon

  return (
    <div
      ref={divRef}
      className={cn('rounded-2xl border overflow-hidden scroll-mt-4', cfg.cardBorder)}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:brightness-110',
          cfg.headerBg
        )}
      >
        {/* Accent line */}
        <div className={cn('w-1 h-10 rounded-full shrink-0', cfg.accentBar)} />

        {/* Badge */}
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0', cfg.badgeBg, cfg.badgeText)}>
          {cfg.num}
        </div>

        {/* Icon */}
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', cfg.iconBg)}>
          <Icon size={15} className={cfg.iconText} />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{cfg.title}</p>
        </div>

        {/* Collapse toggle */}
        {collapsed
          ? <ChevronDown size={14} className="text-muted-foreground/50 shrink-0" />
          : <ChevronUp size={14} className="text-muted-foreground/50 shrink-0" />}
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-5 py-4">
          {/* Special visual frames */}
          {cfg.key === 'buyer_committee' && <BuyerCommitteeTree />}
          {cfg.key === 'sales_playbook' && <SalesFunnel />}
          {cfg.key === 'demand_and_timing' && <DemandTimingStrip />}
          {cfg.key === 'commercial_overview' && <CommercialMetricGrid />}
          {cfg.key === 'watchlist_director_notes' && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-600/10 border border-red-600/20 mb-5">
              <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-300/80">
                Handle with care. Share only with the SE assigned to this account.
              </p>
            </div>
          )}

          <MarkdownRenderer
            className="prose prose-sm max-w-none
              prose-headings:text-foreground prose-headings:font-semibold
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-li:text-muted-foreground
              prose-strong:text-foreground prose-strong:font-semibold
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
              prose-ul:space-y-1 prose-ol:space-y-1
              [&>*:first-child]:mt-0"
          >
            {content}
          </MarkdownRenderer>
        </div>
      )}
    </div>
  )
}

// ─── Markdown fallback parser ─────────────────────────────────────────────────

const SECTION_KEYS = [
  'company_snapshot', 'offer_and_products', 'ideal_buyer_profile',
  'buyer_committee', 'competitor_intelligence', 'sales_playbook',
  'demand_and_timing', 'commercial_overview', 'credibility_assets',
  'strategy_and_focus', 'watchlist_director_notes',
]

function parseProfileMarkdown(markdown: string): Record<string, string> {
  const result: Record<string, string> = {}
  const parts = markdown.split(/(?=^## Section \d+)/m)
  for (const part of parts) {
    const match = part.match(/^## Section (\d+)\s*[—–-]\s*.+\n([\s\S]*)/)
    if (!match) continue
    const key = SECTION_KEYS[parseInt(match[1]) - 1]
    if (key && match[2].trim()) result[key] = match[2].trim()
  }
  return result
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface ClientProfileViewProps {
  contentJson?: Record<string, unknown> | null
  contentMarkdown?: string | null
}

export function ClientProfileView({ contentJson, contentMarkdown }: ClientProfileViewProps) {
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const effectiveJson: Record<string, unknown> =
    contentJson ?? (contentMarkdown ? parseProfileMarkdown(contentMarkdown) : {})

  const activeSections = SECTIONS.filter(s => {
    const v = effectiveJson[s.key]
    return typeof v === 'string' && v.trim().length > 0
  })

  if (activeSections.length === 0) return null

  const scrollTo = (key: string) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-4">
      {/* ── Quick navigation grid ── */}
      <div className="rounded-2xl border border-border/50 bg-muted/20 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2.5 px-1">
          Jump to section
        </p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
          {activeSections.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.key}
                onClick={() => scrollTo(s.key)}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all hover:scale-[1.02]',
                  s.navBg, s.navBorder
                )}
              >
                <div className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0', s.iconBg)}>
                  <Icon size={11} className={s.iconText} />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-[10px] font-semibold truncate', s.navText)}>{s.shortTitle}</p>
                  <p className="text-[9px] text-muted-foreground/60">{s.num}/11</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Section cards ── */}
      {activeSections.map((cfg) => (
        <SectionCard
          key={cfg.key}
          cfg={cfg}
          content={effectiveJson[cfg.key] as string}
          divRef={(el) => { sectionRefs.current[cfg.key] = el }}
        />
      ))}
    </div>
  )
}
