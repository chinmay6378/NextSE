'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, User, TrendingUp, FileText, Send } from 'lucide-react'

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
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Account Executive',
    score: 88,
    status: 'pending',
    date: 'Today',
    testType: 'Objection Handling',
  },
  {
    id: '2',
    name: 'Mike Chen',
    role: 'Sales Dev Rep',
    score: 76,
    status: 'approved',
    date: 'Yesterday',
    testType: 'Discovery Questions',
  },
  {
    id: '3',
    name: 'Jessica Lee',
    role: 'Account Executive',
    score: 92,
    status: 'approved',
    date: '2 days ago',
    testType: 'Closing Techniques',
  },
  {
    id: '4',
    name: 'Robert Martinez',
    role: 'Sales Dev Rep',
    score: 68,
    status: 'rejected',
    date: '3 days ago',
    testType: 'Voice Practice',
  },
  {
    id: '5',
    name: 'Emma Wilson',
    role: 'Account Executive',
    score: 85,
    status: 'pending',
    date: 'Today',
    testType: 'Objection Handling',
  },
]

export function ManagerReview() {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({})
  const [feedbackText, setFeedbackText] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/20 text-emerald-400'
      case 'rejected':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-amber-500/20 text-amber-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 size={16} />
      case 'rejected':
        return <Clock size={16} />
      default:
        return <Clock size={16} />
    }
  }

  const handleApprove = (id: string) => {
    setSelectedStatuses((prev) => ({ ...prev, [id]: 'approved' }))
  }

  const handleReject = (id: string) => {
    setSelectedStatuses((prev) => ({ ...prev, [id]: 'rejected' }))
  }

  const stats = [
    { label: 'Total Submissions', value: submissions.length, icon: FileText, color: 'from-blue-500 to-blue-600' },
    { label: 'Pending Review', value: submissions.filter((s) => (selectedStatuses[s.id] || s.status) === 'pending').length, icon: Clock, color: 'from-amber-500 to-amber-600' },
    { label: 'Approved', value: submissions.filter((s) => (selectedStatuses[s.id] || s.status) === 'approved').length, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Avg Score', value: '82%', icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold">Manager Review</h1>
        <p className="text-muted-foreground mt-2">Review and approve team submissions</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, staggerChildren: 0.1 }}
      >
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Submissions List & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 space-y-3"
        >
          <h2 className="text-lg font-bold">Submissions</h2>
          <div className="space-y-2">
            {submissions.map((submission, idx) => (
              <motion.button
                key={submission.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                onClick={() => setSelectedSubmission(submission)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedSubmission?.id === submission.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 bg-card'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{submission.name}</p>
                    <p className="text-xs text-muted-foreground">{submission.role}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${getStatusColor(selectedStatuses[submission.id] || submission.status)}`}>
                    {(selectedStatuses[submission.id] || submission.status).charAt(0).toUpperCase() + (selectedStatuses[submission.id] || submission.status).slice(1)}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Detail View */}
        {selectedSubmission && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-card border border-border rounded-lg p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedSubmission.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.role}</p>
                </div>
              </div>
              <span className={`text-lg font-bold ${getStatusColor(selectedStatuses[selectedSubmission.id] || selectedSubmission.status)}`}>
                {selectedSubmission.score}%
              </span>
            </div>

            {/* Details */}
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Test Type</p>
                <p className="font-medium">{selectedSubmission.testType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Submitted</p>
                <p className="font-medium">{selectedSubmission.date}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Score Breakdown</p>
                <div className="space-y-2">
                  {[
                    { label: 'MCQ Accuracy', score: 85 },
                    { label: 'Voice Quality', score: 78 },
                    { label: 'Delivery', score: 92 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.label}</span>
                        <span className="font-bold">{item.score}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <motion.div
                          className="bg-primary h-1.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${item.score}%` }}
                          transition={{ delay: 0.4, duration: 0.8 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Manager Feedback</label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Add constructive feedback for the team member..."
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all h-24 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleApprove(selectedSubmission.id)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  (selectedStatuses[selectedSubmission.id] || selectedSubmission.status) === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                <CheckCircle2 size={16} className="inline mr-2" />
                Approve
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleReject(selectedSubmission.id)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  (selectedStatuses[selectedSubmission.id] || selectedSubmission.status) === 'rejected'
                    ? 'bg-red-500/20 text-red-400 border border-red-500'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                <Clock size={16} className="inline mr-2" />
                Request Resubmit
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <Send size={16} />
                Send Feedback
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
