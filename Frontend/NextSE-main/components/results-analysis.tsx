'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, type Variants } from 'framer-motion'
import {
  BarChart2,
  ClipboardList,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { listAdminResults } from '@/lib/api/results'
import type { ResultOut } from '@/lib/api/types'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
}

function ScoreBadge({ score, passed }: { score: number | null; passed?: boolean }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>
  const color = passed == null
    ? score >= 70 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200'
    : passed ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {score.toFixed(0)}%
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
    pass:           'bg-emerald-50 text-emerald-700 border-emerald-200',
    retrain:        'bg-sky-50 text-sky-700 border-sky-200',
    reject:         'bg-red-50 text-red-600 border-red-200',
  }
  const label: Record<string, string> = {
    pending_review: 'Pending Review',
    pass:           'Passed',
    retrain:        'Retrain',
    reject:         'Rejected',
  }
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${map[status] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {label[status] ?? status}
    </span>
  )
}

function SummaryCards({ results }: { results: ResultOut[] }) {
  const completed = results.length
  const avgOverall = completed
    ? Math.round(results.reduce((s, r) => s + (r.overall_score ?? r.knowledge_score ?? 0), 0) / completed)
    : 0
  const passed = results.filter((r) => (r.overall_score ?? r.knowledge_score ?? 0) >= 70).length
  const passRate = completed ? Math.round((passed / completed) * 100) : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { label: 'Total Assessments', value: completed, icon: ClipboardList, color: 'from-indigo-400 to-blue-500' },
        { label: 'Average Score', value: `${avgOverall}%`, icon: BarChart2, color: 'from-orange-400 to-red-500' },
        { label: 'Pass Rate', value: `${passRate}%`, icon: TrendingUp, color: 'from-emerald-400 to-teal-500' },
      ].map(({ label, value, icon: Icon, color }) => (
        <motion.div
          key={label}
          variants={item}
          className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4"
        >
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function BarChartSection({ results }: { results: ResultOut[] }) {
  const byEngineer = Object.entries(
    results.reduce<Record<string, { total: number; count: number }>>((acc, r) => {
      const name = r.engineer_name ?? 'Unknown'
      if (!acc[name]) acc[name] = { total: 0, count: 0 }
      acc[name].total += r.overall_score ?? r.knowledge_score ?? 0
      acc[name].count += 1
      return acc
    }, {})
  )
    .map(([name, { total, count }]) => ({ name: name.split(' ')[0], avg: Math.round(total / count) }))
    .slice(0, 8)

  if (!byEngineer.length) return null

  return (
    <motion.div variants={item} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-semibold text-foreground mb-5">Avg Score by Engineer</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={byEngineer} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.006 60)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'oklch(0.50 0.012 260)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'oklch(0.50 0.012 260)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid oklch(0.91 0.006 60)', borderRadius: 12, fontSize: 12 }}
            cursor={{ fill: 'oklch(0.960 0.005 60)' }}
          />
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <Bar dataKey="avg" fill="url(#barGrad)" radius={[6, 6, 0, 0]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

export function ResultsAnalysis() {
  const { data: results, isLoading } = useQuery({
    queryKey: ['admin-results'],
    queryFn: (): Promise<ResultOut[]> => listAdminResults(),
  })

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="visible">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">Results Analysis</h1>
        <p className="text-muted-foreground mt-1 text-sm">All engineer assessment results across every client</p>
      </motion.div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      )}

      {!isLoading && results && results.length === 0 && (
        <motion.div
          variants={item}
          className="text-center py-16 bg-card border border-border rounded-2xl"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="text-muted-foreground" size={22} />
          </div>
          <p className="font-semibold text-foreground mb-1.5">No results yet</p>
          <p className="text-muted-foreground text-sm">
            Results will appear here once engineers complete their assessments.
          </p>
        </motion.div>
      )}

      {!isLoading && results && results.length > 0 && (
        <>
          <SummaryCards results={results} />
          <BarChartSection results={results} />

          {/* Results table */}
          <motion.div variants={item} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <ClipboardList size={16} className="text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">All Assessment Results</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Engineer', 'Client', 'Knowledge', 'Communication', 'Overall', 'Status', 'Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r, idx) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.3, ease: EASE }}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{r.engineer_name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.client_name ?? '—'}</td>
                      <td className="px-4 py-3"><ScoreBadge score={r.knowledge_score} /></td>
                      <td className="px-4 py-3"><ScoreBadge score={r.communication_score} /></td>
                      <td className="px-4 py-3">
                        <ScoreBadge score={r.overall_score ?? r.knowledge_score} passed={(r.overall_score ?? r.knowledge_score ?? 0) >= 70} />
                      </td>
                      <td className="px-4 py-3"><StatusChip status={r.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
