'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { CheckCircle2, Clock, User, TrendingUp, FileText, RotateCcw, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { listAdminResults, reviewResult } from '@/lib/api/results'
import { ApiError } from '@/lib/api/client'
import type { ResultOut } from '@/lib/api/types'

const RESULT_STYLES: Record<string, string> = {
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  retrain: 'bg-sky-50 text-sky-700 border-sky-200',
  reject: 'bg-red-50 text-red-600 border-red-200',
}
const RESULT_LABELS: Record<string, string> = {
  pending_review: 'Pending Review',
  pass: 'Passed',
  retrain: 'Retrain',
  reject: 'Rejected',
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ?? 0
  const gradient = pct >= 70 ? 'from-emerald-400 to-teal-500' : 'from-red-400 to-orange-500'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-foreground font-medium">{label}</span>
        <span className="font-bold text-foreground">{value != null ? `${Math.round(value)}%` : '—'}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <motion.div
          className={`h-1.5 rounded-full bg-gradient-to-r ${gradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
}

export function ManagerReview() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')

  const { data: results, isLoading } = useQuery({
    queryKey: ['admin-results'],
    queryFn: () => listAdminResults(),
  })

  const rows = results ?? []
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId])

  useEffect(() => {
    setFeedbackText(selected?.reviewer_notes ?? '')
  }, [selected?.id])

  const reviewMutation = useMutation({
    mutationFn: (payload: { status: 'pass' | 'retrain' | 'reject' }) =>
      reviewResult(selected!.id, { status: payload.status, reviewer_notes: feedbackText || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-results'] })
      toast.success('Review saved')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save review'),
  })

  const stats = [
    { label: 'Total Results', value: rows.length, icon: FileText, gradient: 'from-indigo-400 to-blue-500' },
    {
      label: 'Pending Review',
      value: rows.filter((r) => r.status === 'pending_review').length,
      icon: Clock,
      gradient: 'from-amber-400 to-orange-500',
    },
    {
      label: 'Passed',
      value: rows.filter((r) => r.status === 'pass').length,
      icon: CheckCircle2,
      gradient: 'from-emerald-400 to-teal-500',
    },
    {
      label: 'Avg Overall',
      value: (() => {
        const scored = rows.filter((r) => r.overall_score != null)
        if (!scored.length) return '—'
        const avg = scored.reduce((sum, r) => sum + (r.overall_score ?? 0), 0) / scored.length
        return `${Math.round(avg)}%`
      })(),
      icon: TrendingUp,
      gradient: 'from-violet-400 to-purple-500',
    },
  ]

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">Manager Review</h1>
        <p className="text-muted-foreground mt-1 text-sm">Review and approve certification results</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={idx}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 shadow-sm`}>
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Results list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* List */}
        <motion.div variants={item} className="lg:col-span-1 space-y-3">
          <h2 className="text-base font-semibold text-foreground">Results</h2>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No test results yet.</p>
          )}
          <div className="space-y-2">
            {rows.map((r, idx) => {
              const isSelected = selectedId === r.id
              return (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ x: 3, transition: { duration: 0.15 } }}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/6 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 bg-card hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{r.engineer_name ?? 'Unknown engineer'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.client_name ?? 'Unknown client'}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${RESULT_STYLES[r.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                      {RESULT_LABELS[r.status] ?? r.status}
                    </span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-border">
                <div className="flex items-center gap-4">
                  <motion.div
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm"
                  >
                    <User size={20} className="text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{selected.engineer_name ?? 'Unknown engineer'}</h3>
                    <p className="text-sm text-muted-foreground">{selected.client_name ?? 'Unknown client'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-foreground">
                    {selected.overall_score != null ? `${Math.round(selected.overall_score)}%` : '—'}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${RESULT_STYLES[selected.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                    {RESULT_LABELS[selected.status] ?? selected.status}
                  </span>
                </div>
              </div>

              {/* Score bars */}
              <div className="space-y-3">
                <ScoreBar label="Knowledge (MCQ)" value={selected.knowledge_score} />
                <ScoreBar label="Communication (Voice)" value={selected.communication_score} />
                <ScoreBar label="Overall" value={selected.overall_score} />
              </div>

              {/* Feedback textarea */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Reviewer Notes
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Add constructive feedback for the sales engineer…"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all h-24 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ status: 'pass' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border disabled:opacity-50 ${
                    selected.status === 'pass'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <CheckCircle2 size={14} className="inline mr-1.5" />
                  Approve
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ status: 'retrain' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border disabled:opacity-50 ${
                    selected.status === 'retrain'
                      ? 'bg-sky-50 text-sky-700 border-sky-300'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <RotateCcw size={14} className="inline mr-1.5" />
                  Retrain
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ status: 'reject' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border disabled:opacity-50 ${
                    selected.status === 'reject'
                      ? 'bg-red-50 text-red-600 border-red-300'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <XCircle size={14} className="inline mr-1.5" />
                  Reject
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when nothing selected */}
        {!selected && (
          <motion.div
            variants={item}
            className="lg:col-span-2 flex flex-col items-center justify-center text-center py-16 bg-card border border-border rounded-2xl border-dashed"
          >
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <User size={20} className="text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Select a result</p>
            <p className="text-sm text-muted-foreground">Click any result on the left to review it</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
