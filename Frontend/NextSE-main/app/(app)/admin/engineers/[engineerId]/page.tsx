'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowLeft,
  BarChart2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'

import { listAdminResults } from '@/lib/api/results'
import { listAdminTestRequests } from '@/lib/api/tests'
import { apiFetch } from '@/lib/api/client'
import type { Profile, ResultOut, TestRequest } from '@/lib/api/types'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-amber-50 text-amber-700 border-amber-200',
  approved:    'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-sky-50 text-sky-700 border-sky-200',
  completed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
}
const STATUS_LABELS: Record<string, string> = {
  pending:     'Pending',
  approved:    'Approved',
  in_progress: 'In Progress',
  completed:   'Completed',
}

const RESULT_STYLES: Record<string, string> = {
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  pass:           'bg-emerald-50 text-emerald-700 border-emerald-200',
  retrain:        'bg-sky-50 text-sky-700 border-sky-200',
  reject:         'bg-red-50 text-red-600 border-red-200',
}
const RESULT_LABELS: Record<string, string> = {
  pending_review: 'Pending Review',
  pass:           'Passed',
  retrain:        'Retrain',
  reject:         'Rejected',
}

function ScoreBar({ value, max = 100 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>
  const pct = (value / max) * 100
  const color = value >= 70 ? 'from-emerald-400 to-teal-500' : 'from-red-400 to-orange-500'
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
        />
      </div>
      <span className={`text-xs font-bold w-9 text-right ${value >= 70 ? 'text-emerald-600' : 'text-red-500'}`}>
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

export default function EngineerDetailPage({
  params,
}: {
  params: Promise<{ engineerId: string }>
}) {
  const { engineerId } = use(params)

  const { data: engineer, isLoading: engLoading } = useQuery({
    queryKey: ['admin-engineer', engineerId],
    queryFn: () => apiFetch<Profile>(`/admin/users/${engineerId}`),
  })

  const { data: testRequests = [], isLoading: testLoading } = useQuery({
    queryKey: ['admin-test-requests', engineerId],
    queryFn: () => listAdminTestRequests({ engineer_id: engineerId }),
  })

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['admin-results', engineerId],
    queryFn: () => listAdminResults({ engineer_id: engineerId }),
  })

  const isLoading = engLoading || testLoading || resultsLoading

  const totalTests = testRequests.length
  const completed = testRequests.filter((r) => r.status === 'completed').length
  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + (r.overall_score ?? r.knowledge_score ?? 0), 0) / results.length)
    : null
  const passCount = results.filter((r) => (r.overall_score ?? r.knowledge_score ?? 0) >= 70).length

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    )
  }

  if (!engineer) {
    return (
      <div className="text-center py-24 text-muted-foreground">Engineer not found.</div>
    )
  }

  return (
    <motion.div
      className="space-y-7 max-w-4xl"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Back */}
      <motion.div variants={fadeUp}>
        <Link
          href="/admin/engineers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium mb-2"
        >
          <ArrowLeft size={14} />
          Back to Engineers
        </Link>
      </motion.div>

      {/* Profile hero */}
      <motion.div
        variants={fadeUp}
        className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
          {getInitials(engineer.full_name)}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{engineer.full_name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{engineer.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              Sales Engineer
            </span>
            <span className="text-[11px] text-muted-foreground">
              Joined {new Date(engineer.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats strip */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tests Assigned', value: totalTests, icon: ClipboardList, color: 'from-indigo-400 to-blue-500' },
          { label: 'Completed', value: completed, icon: CheckCircle2, color: 'from-emerald-400 to-teal-500' },
          { label: 'Avg Score', value: avgScore != null ? `${avgScore}%` : '—', icon: BarChart2, color: 'from-orange-400 to-red-500' },
          { label: 'Passed', value: passCount, icon: TrendingUp, color: 'from-violet-400 to-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
              <Icon size={14} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Results breakdown */}
      {results.length > 0 && (
        <motion.div variants={fadeUp} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <BarChart2 size={15} className="text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Assessment Results</h2>
          </div>
          <div className="divide-y divide-border">
            {results.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3, ease: EASE }}
                className="px-6 py-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{r.client_name ?? 'Unknown Client'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${RESULT_STYLES[r.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                    {RESULT_LABELS[r.status] ?? r.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground w-28">Knowledge</span>
                    <div className="flex-1"><ScoreBar value={r.knowledge_score} /></div>
                  </div>
                  {r.communication_score != null && (
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground w-28">Communication</span>
                      <div className="flex-1"><ScoreBar value={r.communication_score} /></div>
                    </div>
                  )}
                  {r.overall_score != null && (
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-foreground w-28">Overall</span>
                      <div className="flex-1"><ScoreBar value={r.overall_score} /></div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Test history */}
      <motion.div variants={fadeUp} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <ClipboardList size={15} className="text-muted-foreground" />
          <h2 className="font-semibold text-foreground text-sm">Test History</h2>
        </div>

        {testRequests.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No tests assigned yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {testRequests.map((req, idx) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap"
              >
                <div>
                  <p className="font-medium text-sm text-foreground">{req.client_name ?? 'Unknown Client'}</p>
                  <p className="text-xs text-muted-foreground">
                    Assigned {new Date(req.requested_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {req.score_percent != null && (
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${req.passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {req.score_percent.toFixed(0)}%
                    </span>
                  )}
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[req.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                    {STATUS_LABELS[req.status] ?? req.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
