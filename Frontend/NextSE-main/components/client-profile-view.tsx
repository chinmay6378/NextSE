'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'

// ─── Section config ───────────────────────────────────────────────────────────

interface SectionCfg {
  key: string
  num: number
  title: string
  shortTitle: string
}

const SECTIONS: SectionCfg[] = [
  { key: 'company_snapshot',        num: 1,  title: 'Company Snapshot',         shortTitle: 'Company'    },
  { key: 'offer_and_products',      num: 2,  title: 'Offer & Products',         shortTitle: 'Products'   },
  { key: 'ideal_buyer_profile',     num: 3,  title: 'Ideal Buyer Profile',      shortTitle: 'Ideal Buyer'},
  { key: 'buyer_committee',         num: 4,  title: 'Buyer Committee',          shortTitle: 'Committee'  },
  { key: 'competitor_intelligence', num: 5,  title: 'Competitor Intelligence',  shortTitle: 'Competitors'},
  { key: 'sales_playbook',          num: 6,  title: 'Sales Playbook',           shortTitle: 'Playbook'   },
  { key: 'demand_and_timing',       num: 7,  title: 'Demand & Timing',          shortTitle: 'Timing'     },
  { key: 'commercial_overview',     num: 8,  title: 'Commercial Overview',      shortTitle: 'Commercial' },
  { key: 'credibility_assets',      num: 9,  title: 'Credibility Assets',       shortTitle: 'Credibility'},
  { key: 'strategy_and_focus',      num: 10, title: 'Strategy & Focus',         shortTitle: 'Strategy'   },
  { key: 'watchlist_director_notes',num: 11, title: 'Watchlist / Director Notes',shortTitle: 'Watchlist' },
]

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

  return (
    <div ref={divRef} className="rounded-xl border border-border bg-card scroll-mt-4">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">{cfg.num}.</span>
        <span className="flex-1 text-sm font-semibold text-foreground">{cfg.title}</span>
        {collapsed
          ? <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          : <ChevronUp size={14} className="text-muted-foreground shrink-0" />}
      </button>

      {!collapsed && (
        <div className="px-5 pb-4 pt-1 border-t border-border">
          <MarkdownRenderer
            className="prose prose-sm max-w-none
              [--tw-prose-body:hsl(var(--foreground))]
              [--tw-prose-headings:hsl(var(--foreground))]
              [--tw-prose-bold:hsl(var(--foreground))]
              [--tw-prose-bullets:hsl(var(--foreground))]
              [--tw-prose-counters:hsl(var(--foreground))]
              [--tw-prose-links:hsl(var(--primary))]
              prose-headings:font-semibold
              prose-p:leading-relaxed
              prose-a:no-underline hover:prose-a:underline
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
  const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  let currentKey: string | null = null
  const buf: string[] = []

  const flush = () => {
    if (currentKey) {
      const content = buf.join('\n').trim()
      if (content) result[currentKey] = content
    }
    buf.length = 0
  }

  for (const line of lines) {
    const m = line.match(/^##\s+Section\s+(\d+)/)
    if (m) {
      flush()
      currentKey = SECTION_KEYS[parseInt(m[1]) - 1] ?? null
    } else if (currentKey !== null) {
      buf.push(line)
    }
  }
  flush()
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

  if (activeSections.length === 0) {
    if (!contentMarkdown) return null
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground px-1">
          This profile was generated with an older format. Click <strong>Regenerate</strong> to get the updated layout.
        </p>
        <MarkdownRenderer
          className="prose prose-sm max-w-none
            prose-headings:text-foreground prose-headings:font-semibold
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-li:text-muted-foreground
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
            prose-ul:space-y-1 prose-ol:space-y-1
            [&>*:first-child]:mt-0"
        >
          {contentMarkdown}
        </MarkdownRenderer>
      </div>
    )
  }

  const scrollTo = (key: string) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-3">
      {/* Quick navigation */}
      <div className="flex flex-wrap gap-1.5 pb-2">
        {activeSections.map((s) => (
          <button
            key={s.key}
            onClick={() => scrollTo(s.key)}
            className="text-[11px] px-2.5 py-1 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {s.num}. {s.shortTitle}
          </button>
        ))}
      </div>

      {/* Section cards */}
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
