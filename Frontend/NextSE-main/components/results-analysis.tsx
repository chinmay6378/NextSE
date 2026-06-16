'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Download, Share2, TrendingUp, AlertCircle } from 'lucide-react'

const scoreData = [
  { test: 'Objection', score: 85 },
  { test: 'Discovery', score: 78 },
  { test: 'Closing', score: 72 },
  { test: 'Rapport', score: 90 },
]

const categoryBreakdown = [
  { name: 'MCQ Accuracy', value: 82 },
  { name: 'Voice Quality', value: 76 },
  { name: 'Delivery', value: 88 },
  { name: 'Clarity', value: 79 },
]

const strengths = [
  'Excellent rapport building skills',
  'Strong discovery question formation',
  'Clear and confident speaking voice',
]

const improvements = [
  'Practice handling budget objections',
  'Work on closing techniques',
  'Improve response time to objections',
]

const COLORS = ['#8366ff', '#a78bfa', '#c4b5fd', '#ddd6fe']

// Still mock — Phase 5 wires this to GET /results + GET /results/{id}.
export function ResultsAnalysis() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold">Results Analysis</h1>
        <p className="text-muted-foreground mt-2">Your comprehensive performance breakdown</p>
      </motion.div>

      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/50 rounded-lg p-8 text-center"
      >
        <h2 className="text-muted-foreground mb-2">Overall Score</h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-6xl font-bold mb-2"
        >
          81%
        </motion.p>
        <div className="flex items-center justify-center gap-2 text-emerald-400">
          <TrendingUp size={20} />
          <span>+5% from last test</span>
        </div>
      </motion.div>

      {/* Charts Section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Test Scores */}
        <motion.div
          variants={itemVariants}
          className="bg-card border border-border rounded-lg p-6"
        >
          <h3 className="text-lg font-bold mb-4">Test Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="test" stroke="#ffffff50" />
              <YAxis stroke="#ffffff50" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff20', borderRadius: '8px' }}
              />
              <Bar dataKey="score" fill="#8366ff" animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          variants={itemVariants}
          className="bg-card border border-border rounded-lg p-6"
        >
          <h3 className="text-lg font-bold mb-4">Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8366ff"
                dataKey="value"
              >
                {categoryBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Strengths & Improvements */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Strengths */}
        <motion.div
          variants={itemVariants}
          className="bg-card border border-emerald-500/30 rounded-lg p-6"
        >
          <h3 className="text-lg font-bold mb-4 text-emerald-400 flex items-center gap-2">
            <CheckCircle size={20} />
            Strengths
          </h3>
          <ul className="space-y-3">
            {strengths.map((strength, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="text-emerald-400 mt-1">✓</span>
                <span className="text-sm">{strength}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Areas for Improvement */}
        <motion.div
          variants={itemVariants}
          className="bg-card border border-amber-500/30 rounded-lg p-6"
        >
          <h3 className="text-lg font-bold mb-4 text-amber-400 flex items-center gap-2">
            <AlertCircle size={20} />
            Areas for Improvement
          </h3>
          <ul className="space-y-3">
            {improvements.map((improvement, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="text-amber-400 mt-1">→</span>
                <span className="text-sm">{improvement}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </motion.div>

      {/* Detailed Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <h3 className="text-lg font-bold mb-4">Detailed Feedback</h3>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            Your performance shows strong improvement across most categories. Your ability to build rapport was exceptional, with clear, confident delivery that would resonate well with clients. This is a key strength to leverage in your sales conversations.
          </p>
          <p>
            Focus on the area of objection handling, particularly around pricing objections. Practice responses that acknowledge the concern while emphasizing value and ROI. Consider reviewing the module &quot;Overcoming Budget Objections&quot; for targeted practice.
          </p>
          <p>
            Overall, you&apos;re on an excellent trajectory. Continue your study streak and gradually increase the difficulty level of your practice tests to further improve your skills.
          </p>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="flex gap-4 justify-end"
      >
        <button className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-muted transition-colors">
          <Download size={18} />
          Download Report
        </button>
        <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
          <Share2 size={18} />
          Share Results
        </button>
      </motion.div>
    </div>
  )
}

// Import the CheckCircle icon if not already imported
import { CheckCircle } from 'lucide-react'
