'use client'

import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { CheckCircle, Clock, Zap, Users } from 'lucide-react'

const chartData = [
  { date: 'Mon', score: 65 },
  { date: 'Tue', score: 72 },
  { date: 'Wed', score: 68 },
  { date: 'Thu', score: 78 },
  { date: 'Fri', score: 85 },
  { date: 'Sat', score: 88 },
  { date: 'Sun', score: 92 },
]

const activities = [
  { id: 1, action: 'Completed Test: Objection Handling', time: '2 hours ago', icon: CheckCircle },
  { id: 2, action: 'Studied Module: Discovery Questions', time: '5 hours ago', icon: Clock },
  { id: 3, action: 'Scored 87% on Voice Practice', time: 'Yesterday', icon: Zap },
  { id: 4, action: 'Joined study group with 3 others', time: '2 days ago', icon: Users },
]

export function Dashboard() {
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
      transition: { duration: 0.5, ease: 'easeOut' },
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
        <h1 className="text-3xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground mt-2">Track your sales mastery journey</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[
          { label: 'Tests Completed', value: '12', change: '+2 this week', color: 'from-blue-500 to-blue-600' },
          { label: 'Study Streak', value: '7 days', change: 'Keep it going!', color: 'from-purple-500 to-purple-600' },
          { label: 'Avg. Score', value: '82%', change: '+3% from last week', color: 'from-emerald-500 to-emerald-600' },
          { label: 'Voice Sessions', value: '24', change: 'Great progress!', color: 'from-amber-500 to-amber-600' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
              <Zap size={24} className="text-white" />
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">{stat.label}</h3>
            <p className="text-2xl font-bold mb-2">{stat.value}</p>
            <p className="text-xs text-emerald-400">{stat.change}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <motion.div
          className="lg:col-span-2 bg-card border border-border rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2 className="text-lg font-bold mb-4">Weekly Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" stroke="#ffffff50" />
              <YAxis stroke="#ffffff50" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8366ff"
                dot={{ fill: '#8366ff', r: 5 }}
                activeDot={{ r: 7 }}
                strokeWidth={2}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          className="bg-card border border-border rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h2 className="text-lg font-bold mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Test Mastery</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">75% Complete</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Voice Skills</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-secondary h-2 rounded-full" style={{ width: '60%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">60% Complete</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Module Progress</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-accent h-2 rounded-full" style={{ width: '90%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">90% Complete</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        className="bg-card border border-border rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {activities.map((activity, idx) => {
            const Icon = activity.icon
            return (
              <motion.div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + idx * 0.1 }}
              >
                <Icon size={18} className="text-primary mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
