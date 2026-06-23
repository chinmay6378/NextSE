'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart2,
  ChevronRight,
  Loader2,
  Users,
} from 'lucide-react'
import Link from 'next/link'

import { listAdminResults } from '@/lib/api/results'
import { listEngineers } from '@/lib/api/tests'
import type { Profile, ResultOut } from '@/lib/api/types'
import { type Variants } from 'framer-motion'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const card: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function EngineerCard({ engineer, results }: { engineer: Profile; results: ResultOut[] }) {
  const myResults = results.filter((r) => r.engineer_id === engineer.id)
  const total = myResults.length
  const avg = total
    ? Math.round(myResults.reduce((s, r) => s + (r.overall_score ?? r.knowledge_score ?? 0), 0) / total)
    : null
  const lastDate = myResults[0]?.created_at
    ? new Date(myResults[0].created_at).toLocaleDateString()
    : null

  return (
    <motion.div
      variants={card}
      whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.08)' }}
      className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 transition-all duration-200"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
        {getInitials(engineer.full_name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{engineer.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{engineer.email}</p>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-5 shrink-0">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{total}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tests</p>
        </div>
        <div className="text-center">
          {avg != null ? (
            <>
              <p className={`text-lg font-bold ${avg >= 70 ? 'text-emerald-600' : 'text-red-500'}`}>{avg}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Score</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-muted-foreground">—</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Score</p>
            </>
          )}
        </div>
        {lastDate && (
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{lastDate}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last Active</p>
          </div>
        )}
      </div>

      {/* Arrow */}
      <Link
        href={`/admin/engineers/${engineer.id}`}
        className="shrink-0 w-9 h-9 rounded-xl bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
      >
        <ChevronRight size={16} />
      </Link>
    </motion.div>
  )
}

export default function EngineersPage() {
  const { data: engineers, isLoading: engLoading } = useQuery({
    queryKey: ['admin-engineers'],
    queryFn: listEngineers,
  })

  const { data: results = [] as ResultOut[] } = useQuery({
    queryKey: ['admin-results'],
    queryFn: () => listAdminResults(),
  })

  const isLoading = engLoading

  return (
    <div className="space-y-7 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-md">
          <Users size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Engineers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {engineers?.length ?? 0} engineers · click a profile to see full activity
          </p>
        </div>
      </div>

      {/* Summary stat */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Total Assessments',
              value: results.length,
              icon: BarChart2,
              color: 'from-indigo-400 to-blue-500',
            },
            {
              label: 'Avg Score',
              value: `${Math.round(results.reduce((s, r) => s + (r.overall_score ?? r.knowledge_score ?? 0), 0) / results.length)}%`,
              icon: BarChart2,
              color: 'from-orange-400 to-red-500',
            },
            {
              label: 'Pass Rate',
              value: `${Math.round((results.filter((r) => (r.overall_score ?? r.knowledge_score ?? 0) >= 70).length / results.length) * 100)}%`,
              icon: BarChart2,
              color: 'from-emerald-400 to-teal-500',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                <Icon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      )}

      {!isLoading && !engineers?.length && (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Users className="mx-auto mb-3 text-muted-foreground" size={40} />
          <p className="font-semibold text-foreground mb-1.5">No engineers yet</p>
          <p className="text-muted-foreground text-sm">Engineers will appear here once they sign up.</p>
        </div>
      )}

      {engineers && engineers.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {engineers.map((eng) => (
            <EngineerCard key={eng.id} engineer={eng} results={results} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
