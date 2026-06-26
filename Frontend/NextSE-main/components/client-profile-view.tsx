'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionCfg {
  key: string
  num: number
  title: string
  shortTitle: string
}

interface ProductFAB {
  product_name: string
  feature: string
  advantage: string
  benefit: string
  business_driver: string
}

interface StakeholderEntry {
  role_title: string
  stakeholder_type: string
  negotiator_type: string
  power_level: string
  win_condition: string
  conversation_opener: string
  watch_out_for: string
}

interface DiscoveryQuestion {
  category: string
  question: string
  purpose: string
}

interface ObjectionBattleCard {
  objection: string
  accusation_audit: string
  calibrated_response: string
  recovery_question: string
}

interface CompetitorEntry {
  competitor_name: string
  why_prospects_choose_them: string
  where_this_client_wins: string
  battle_card_response: string
  recommended_strategy: string
}

// ─── Narrative sections ───────────────────────────────────────────────────────

const SECTIONS: SectionCfg[] = [
  { key: 'company_snapshot',         num: 1,  title: 'Company Snapshot',          shortTitle: 'Company'    },
  { key: 'offer_and_products',       num: 2,  title: 'Offer & Products',          shortTitle: 'Products'   },
  { key: 'ideal_buyer_profile',      num: 3,  title: 'Ideal Buyer Profile',       shortTitle: 'Ideal Buyer'},
  { key: 'buyer_committee',          num: 4,  title: 'Buyer Committee',           shortTitle: 'Committee'  },
  { key: 'competitor_intelligence',  num: 5,  title: 'Competitor Intelligence',   shortTitle: 'Competitors'},
  { key: 'sales_playbook',           num: 6,  title: 'Sales Playbook',            shortTitle: 'Playbook'   },
  { key: 'demand_and_timing',        num: 7,  title: 'Demand & Timing',           shortTitle: 'Timing'     },
  { key: 'commercial_overview',      num: 8,  title: 'Commercial Overview',       shortTitle: 'Commercial' },
  { key: 'credibility_assets',       num: 9,  title: 'Credibility Assets',        shortTitle: 'Credibility'},
  { key: 'strategy_and_focus',       num: 10, title: 'Strategy & Focus',          shortTitle: 'Strategy'   },
  { key: 'watchlist_director_notes', num: 11, title: 'Watchlist / Director Notes',shortTitle: 'Watchlist'  },
]

// ─── Collapsible wrapper ──────────────────────────────────────────────────────

function CollapsibleCard({
  num,
  title,
  divRef,
  children,
  defaultCollapsed = false,
}: {
  num: number
  title: string
  divRef?: (el: HTMLDivElement | null) => void
  children: React.ReactNode
  defaultCollapsed?: boolean
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  return (
    <div ref={divRef} className="rounded-xl border border-border bg-card scroll-mt-4">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">{num}.</span>
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        {collapsed
          ? <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          : <ChevronUp size={14} className="text-muted-foreground shrink-0" />}
      </button>
      {!collapsed && (
        <div className="px-5 pb-4 pt-1 border-t border-border">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Narrative section card ───────────────────────────────────────────────────

function SectionCard({
  cfg,
  content,
  divRef,
}: {
  cfg: SectionCfg
  content: string
  divRef: (el: HTMLDivElement | null) => void
}) {
  return (
    <CollapsibleCard num={cfg.num} title={cfg.title} divRef={divRef}>
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
    </CollapsibleCard>
  )
}

// ─── FAB Chains ───────────────────────────────────────────────────────────────

function FABChainsCard({ items, num, divRef }: { items: ProductFAB[]; num: number; divRef: (el: HTMLDivElement | null) => void }) {
  return (
    <CollapsibleCard num={num} title="FAB Chains" divRef={divRef}>
      <div className="space-y-4">
        {items.map((fab, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{fab.product_name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">{fab.business_driver}</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-20 shrink-0">Feature (IS)</span>
                <span className="text-foreground">{fab.feature}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-20 shrink-0">Advantage (DOES)</span>
                <span className="text-foreground">{fab.advantage}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-20 shrink-0">Benefit (MEANS)</span>
                <span className="text-foreground">{fab.benefit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  )
}

// ─── Stakeholder Map ──────────────────────────────────────────────────────────

function StakeholderMapCard({ items, num, divRef }: { items: StakeholderEntry[]; num: number; divRef: (el: HTMLDivElement | null) => void }) {
  return (
    <CollapsibleCard num={num} title="Stakeholder Map" divRef={divRef}>
      <div className="space-y-4">
        {items.map((s, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{s.role_title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">{s.stakeholder_type}</span>
              <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">{s.negotiator_type}</span>
              <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">Power: {s.power_level}</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-28 shrink-0">Win Condition</span>
                <span className="text-foreground">{s.win_condition}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-28 shrink-0">Opener</span>
                <span className="text-foreground italic">&ldquo;{s.conversation_opener}&rdquo;</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-28 shrink-0">Watch Out For</span>
                <span className="text-foreground">{s.watch_out_for}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  )
}

// ─── Discovery Questions ──────────────────────────────────────────────────────

const QUESTION_CATEGORIES = ['Situation', 'Problem', 'Implication', 'Urgency', 'Commitment']

function DiscoveryQuestionsCard({ items, num, divRef }: { items: DiscoveryQuestion[]; num: number; divRef: (el: HTMLDivElement | null) => void }) {
  const grouped = QUESTION_CATEGORIES.reduce<Record<string, DiscoveryQuestion[]>>((acc, cat) => {
    acc[cat] = items.filter(q => q.category === cat)
    return acc
  }, {})

  return (
    <CollapsibleCard num={num} title="Discovery Questions" divRef={divRef}>
      <div className="space-y-4">
        {QUESTION_CATEGORIES.map(cat => {
          const qs = grouped[cat]
          if (!qs?.length) return null
          return (
            <div key={cat}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</p>
              <div className="space-y-2">
                {qs.map((q, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                    <p className="text-xs font-medium text-foreground">&ldquo;{q.question}&rdquo;</p>
                    <p className="text-[11px] text-muted-foreground">{q.purpose}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </CollapsibleCard>
  )
}

// ─── Objection Battle Cards ───────────────────────────────────────────────────

function ObjectionBattleCardsCard({ items, num, divRef }: { items: ObjectionBattleCard[]; num: number; divRef: (el: HTMLDivElement | null) => void }) {
  return (
    <CollapsibleCard num={num} title="Objection Battle Cards" divRef={divRef}>
      <div className="space-y-4">
        {items.map((card, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">&ldquo;{card.objection}&rdquo;</p>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-32 shrink-0">Accusation Audit</span>
                <span className="text-foreground italic">{card.accusation_audit}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-32 shrink-0">Response</span>
                <span className="text-foreground">{card.calibrated_response}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-32 shrink-0">Recovery</span>
                <span className="text-foreground italic">&ldquo;{card.recovery_question}&rdquo;</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  )
}

// ─── Competitor Entries ───────────────────────────────────────────────────────

function CompetitorEntriesCard({ items, num, divRef }: { items: CompetitorEntry[]; num: number; divRef: (el: HTMLDivElement | null) => void }) {
  return (
    <CollapsibleCard num={num} title="Competitor Battle Cards" divRef={divRef}>
      <div className="space-y-4">
        {items.map((c, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{c.competitor_name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">{c.recommended_strategy}</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-32 shrink-0">Why They Win</span>
                <span className="text-foreground">{c.why_prospects_choose_them}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-32 shrink-0">Where We Win</span>
                <span className="text-foreground">{c.where_this_client_wins}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-muted-foreground w-32 shrink-0">Battle Card</span>
                <span className="text-foreground italic">&ldquo;{c.battle_card_response}&rdquo;</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  )
}

// ─── Accusation Audit ─────────────────────────────────────────────────────────

function AccusationAuditCard({ items, num, divRef }: { items: string[]; num: number; divRef: (el: HTMLDivElement | null) => void }) {
  return (
    <CollapsibleCard num={num} title="Accusation Audit Labels" divRef={divRef}>
      <ul className="space-y-2">
        {items.map((label, i) => (
          <li key={i} className="flex gap-2 text-xs">
            <span className="text-muted-foreground shrink-0">{i + 1}.</span>
            <span className="text-foreground italic">{label}</span>
          </li>
        ))}
      </ul>
    </CollapsibleCard>
  )
}

// ─── ICP Qualifier ────────────────────────────────────────────────────────────

function ICPQualifierCard({ items, num, divRef }: { items: string[]; num: number; divRef: (el: HTMLDivElement | null) => void }) {
  return (
    <CollapsibleCard num={num} title="ICP Qualifier Questions" divRef={divRef}>
      <ul className="space-y-2">
        {items.map((q, i) => (
          <li key={i} className="flex gap-2 text-xs">
            <span className="text-muted-foreground shrink-0">{i + 1}.</span>
            <span className="text-foreground">{q}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground mt-3">4+ Yes = pursue · Fewer than 3 = qualify out</p>
    </CollapsibleCard>
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

  const fabChains = (effectiveJson.product_fab_chains as ProductFAB[] | undefined) ?? []
  const stakeholderMap = (effectiveJson.stakeholder_map as StakeholderEntry[] | undefined) ?? []
  const discoveryQuestions = (effectiveJson.discovery_questions as DiscoveryQuestion[] | undefined) ?? []
  const objectionCards = (effectiveJson.objection_battle_cards as ObjectionBattleCard[] | undefined) ?? []
  const competitorEntries = (effectiveJson.competitor_entries as CompetitorEntry[] | undefined) ?? []
  const accusationLabels = (effectiveJson.accusation_audit_labels as string[] | undefined) ?? []
  const icpQuestions = (effectiveJson.icp_qualifier_questions as string[] | undefined) ?? []

  const scrollTo = (key: string) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Build nav pills: narrative sections + structured sections that have data
  const structuredNavItems = [
    fabChains.length > 0        && { key: 'fab',         num: 12, shortTitle: 'FAB Chains'  },
    stakeholderMap.length > 0   && { key: 'stakeholders', num: 13, shortTitle: 'Stakeholders'},
    discoveryQuestions.length > 0 && { key: 'discovery',  num: 14, shortTitle: 'Discovery'  },
    objectionCards.length > 0   && { key: 'objections',   num: 15, shortTitle: 'Objections' },
    competitorEntries.length > 0 && { key: 'competitors', num: 16, shortTitle: 'Battle Cards'},
    accusationLabels.length > 0 && { key: 'audit',        num: 17, shortTitle: 'Audit'      },
    icpQuestions.length > 0     && { key: 'icp',          num: 18, shortTitle: 'ICP'        },
  ].filter(Boolean) as { key: string; num: number; shortTitle: string }[]

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
        {structuredNavItems.map((s) => (
          <button
            key={s.key}
            onClick={() => scrollTo(s.key)}
            className="text-[11px] px-2.5 py-1 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {s.num}. {s.shortTitle}
          </button>
        ))}
      </div>

      {/* Narrative section cards */}
      {activeSections.map((cfg) => (
        <SectionCard
          key={cfg.key}
          cfg={cfg}
          content={effectiveJson[cfg.key] as string}
          divRef={(el) => { sectionRefs.current[cfg.key] = el }}
        />
      ))}

      {/* Structured data sections */}
      {fabChains.length > 0 && (
        <FABChainsCard
          items={fabChains}
          num={12}
          divRef={(el) => { sectionRefs.current['fab'] = el }}
        />
      )}
      {stakeholderMap.length > 0 && (
        <StakeholderMapCard
          items={stakeholderMap}
          num={13}
          divRef={(el) => { sectionRefs.current['stakeholders'] = el }}
        />
      )}
      {discoveryQuestions.length > 0 && (
        <DiscoveryQuestionsCard
          items={discoveryQuestions}
          num={14}
          divRef={(el) => { sectionRefs.current['discovery'] = el }}
        />
      )}
      {objectionCards.length > 0 && (
        <ObjectionBattleCardsCard
          items={objectionCards}
          num={15}
          divRef={(el) => { sectionRefs.current['objections'] = el }}
        />
      )}
      {competitorEntries.length > 0 && (
        <CompetitorEntriesCard
          items={competitorEntries}
          num={16}
          divRef={(el) => { sectionRefs.current['competitors'] = el }}
        />
      )}
      {accusationLabels.length > 0 && (
        <AccusationAuditCard
          items={accusationLabels}
          num={17}
          divRef={(el) => { sectionRefs.current['audit'] = el }}
        />
      )}
      {icpQuestions.length > 0 && (
        <ICPQualifierCard
          items={icpQuestions}
          num={18}
          divRef={(el) => { sectionRefs.current['icp'] = el }}
        />
      )}
    </div>
  )
}
