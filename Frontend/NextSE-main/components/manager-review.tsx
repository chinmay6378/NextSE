'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, User, TrendingUp, FileText, Send, XCircle } from 'lucide-react'

interface Submission {
  id: string
  name: string
  role: string
  score: number
  status: 'pending' | 'approved' | 'rejected'
  date: string
  testType: string
}

const submissions: Submission[] = [
  { id: '1', name: 'Sarah Johnson',   role: 'Account Executive', score: 88, status: 'pending',  date: 'Today',      testType: 'Objection Handling' },
  { id: '2', name: 'Mike Chen',       role: 'Sales Dev Rep',     score: 76, status: 'approved', date: 'Yesterday',  testType: 'Discovery Questions' },
  { id: '3', name: 'Jessica Lee',     role: 'Account Executive', score: 92, status: 'approved', date: '2 days ago', testType: 'Closing Techniques' },
  { id: '4', name: 'Robert Martinez', role: 'Sales Dev Rep',     score: 68, status: 'rejected', date: '3 days ago', testType: 'Voice Practice' },
  { id: '5', name: 'Emma Wilson',     role: 'Account Executive', score: 85, status: 'pending',  date: 'Today',      testType: 'Objection Handling' },
]

function getStatusStyle(status: string) {
  switch (status) {
    case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'rejected': return 'bg-red-50 text-red-600 border-red-200'
    default:         return 'bg-amber-50 text-amber-700 border-amber-200'
  }
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
}

export function ManagerReview() {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({})
  const [feedbackText, setFeedbackText] = useState('')

  const getEffectiveStatus = (s: Submission) => selectedStatuses[s.id] || s.status

  const stats = [
    { label: 'Total Submissions', value: submissions.length, icon: FileText,    gradient: 'from-indigo-400 to-blue-500' },
    { label: 'Pending Review',    value: submissions.filter((s) => getEffectiveStatus(s) === 'pending').length,  icon: Clock,       gradient: 'from-amber-400 to-orange-500' },
    { label: 'Approved',          value: submissions.filter((s) => getEffectiveStatus(s) === 'approved').length, icon: CheckCircle2, gradient: 'from-emerald-400 to-teal-500' },
    { label: 'Avg Score',         value: '82%',                                                                  icon: TrendingUp,  gradient: 'from-violet-400 to-purple-500' },
  ]

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">Manager Review</h1>
        <p className="text-muted-foreground mt-1 text-sm">Review and approve team submissions</p>
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

      {/* Submissions list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* List */}
        <motion.div variants={item} className="lg:col-span-1 space-y-3">
          <h2 className="text-base font-semibold text-foreground">Submissions</h2>
          <div className="space-y-2">
            {submissions.map((submission, idx) => {
              const status = getEffectiveStatus(submission)
              const selected = selectedSubmission?.id === submission.id
              return (
                <motion.button
                  key={submission.id}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ x: 3, transition: { duration: 0.15 } }}
                  onClick={() => setSelectedSubmission(submission)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                    selected
                      ? 'border-primary bg-primary/6 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 bg-card hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{submission.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{submission.role}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusStyle(status)}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          {selectedSubmission && (
            <motion.div
              key={selectedSubmission.id}
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
                    <h3 className="text-lg font-bold text-foreground">{selectedSubmission.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedSubmission.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-foreground">{selectedSubmission.score}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedSubmission.testType}</p>
                </div>
              </div>

              {/* Score bars */}
              <div className="space-y-3">
                {[
                  { label: 'MCQ Accuracy', score: 85, gradient: 'from-indigo-400 to-blue-500' },
                  { label: 'Voice Quality', score: 78, gradient: 'from-violet-400 to-purple-500' },
                  { label: 'Delivery',      score: 92, gradient: 'from-emerald-400 to-teal-500' },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-foreground font-medium">{bar.label}</span>
                      <span className="font-bold text-foreground">{bar.score}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <motion.div
                        className={`h-1.5 rounded-full bg-gradient-to-r ${bar.gradient}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${bar.score}%` }}
                        transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Feedback textarea */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Manager Feedback
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Add constructive feedback for the team member…"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all h-24 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedStatuses((p) => ({ ...p, [selectedSubmission.id]: 'approved' }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    getEffectiveStatus(selectedSubmission) === 'approved'
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
                  onClick={() => setSelectedStatuses((p) => ({ ...p, [selectedSubmission.id]: 'rejected' }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    getEffectiveStatus(selectedSubmission) === 'rejected'
                      ? 'bg-red-50 text-red-600 border-red-300'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <XCircle size={14} className="inline mr-1.5" />
                  Request Resubmit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 6px 22px oklch(0.618 0.195 38 / 0.26)' }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-all"
                  style={{ background: 'linear-gradient(135deg, oklch(0.618 0.195 38), oklch(0.540 0.210 15))' }}
                >
                  <Send size={14} />
                  Send
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when nothing selected */}
        {!selectedSubmission && (
          <motion.div
            variants={item}
            className="lg:col-span-2 flex flex-col items-center justify-center text-center py-16 bg-card border border-border rounded-2xl border-dashed"
          >
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <User size={20} className="text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Select a submission</p>
            <p className="text-sm text-muted-foreground">Click any submission on the left to review it</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
