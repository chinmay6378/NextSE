'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  PlusCircle,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api/client'
import { listClients } from '@/lib/api/clients'
import { listAdminResults } from '@/lib/api/results'
import { approveTestRequest, createTestRequest, listAdminTestRequests, listEngineers } from '@/lib/api/tests'
import type { Profile, ResultOut, TestRequest } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const TR_STATUS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Pending' },
  approved:    { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  dot: 'bg-indigo-400',  label: 'Assigned' },
  in_progress: { bg: 'bg-sky-500/10',     text: 'text-sky-400',     dot: 'bg-sky-400 animate-pulse', label: 'In Progress' },
  completed:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Completed' },
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// ── Per-engineer expandable table row ──────────────────────────────────────
function EngineerRow({
  engineer,
  requests,
  results,
  publishedClients,
}: {
  engineer: Profile
  requests: TestRequest[]
  results: ResultOut[]
  publishedClients: Array<{ id: string; name: string }>
}) {
  const [expanded, setExpanded] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const queryClient = useQueryClient()

  const myRequests = requests.filter(r => r.engineer_id === engineer.id)
  const myResults  = results.filter(r => r.engineer_id === engineer.id)

  const completedCount = myRequests.filter(r => r.status === 'completed').length
  const avgScore = myResults.length
    ? Math.round(myResults.reduce((s, r) => s + (r.overall_score ?? r.knowledge_score ?? 0), 0) / myResults.length)
    : null

  const assignedClientIds = new Set(myRequests.map(r => r.client_id))
  const availableClients  = publishedClients.filter(c => !assignedClientIds.has(c.id))

  const assignMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const req = await createTestRequest(clientId, engineer.id)
      await approveTestRequest(req.id)
      return req
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-requests'] })
      setSelectedClientId('')
      toast.success(`Client assigned to ${engineer.full_name}`)
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not assign'),
  })

  return (
    <>
      {/* Main row */}
      <tr
        onClick={() => setExpanded(e => !e)}
        className={cn(
          'border-b border-border/40 cursor-pointer transition-colors',
          expanded ? 'bg-muted/30' : 'hover:bg-muted/20',
        )}
      >
        {/* Engineer info */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
              {getInitials(engineer.full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight truncate">
                {engineer.full_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{engineer.email}</p>
            </div>
          </div>
        </td>

        {/* Assigned clients count */}
        <td className="px-5 py-4 text-center">
          <p className="text-base font-bold text-foreground">{myRequests.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">clients</p>
        </td>

        {/* Completed */}
        <td className="px-5 py-4 text-center">
          <p className="text-base font-bold text-foreground">
            {completedCount}
            <span className="text-muted-foreground font-normal text-sm">/{myRequests.length}</span>
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">done</p>
        </td>

        {/* Avg score */}
        <td className="px-5 py-4 text-center">
          {avgScore != null ? (
            <p className={cn('text-base font-bold', avgScore >= 70 ? 'text-emerald-400' : 'text-red-400')}>
              {avgScore}%
            </p>
          ) : (
            <p className="text-base text-muted-foreground/40">—</p>
          )}
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">avg score</p>
        </td>

        {/* Expand toggle */}
        <td className="px-5 py-4 text-right">
          <div className="inline-flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                expanded
                  ? 'bg-muted/60 text-muted-foreground'
                  : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',
              )}
            >
              {expanded ? <ChevronUp size={12} /> : <PlusCircle size={12} />}
              {expanded ? 'Close' : 'Assign'}
            </div>
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="border-b border-border/40">
          <td colSpan={5} className="bg-muted/10 px-5 pt-1 pb-5">
            <div className="space-y-4 mt-3">

              {/* Assign new client — FIRST for quick access */}
              <div
                className="bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-3"
                onClick={e => e.stopPropagation()}
              >
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <PlusCircle size={12} />
                  Assign New Client
                </p>
                {availableClients.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={selectedClientId}
                      onChange={e => setSelectedClientId(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-input/60 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 min-w-[180px] max-w-xs"
                    >
                      <option value="">Select a client…</option>
                      {availableClients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={e => { e.stopPropagation(); selectedClientId && assignMutation.mutate(selectedClientId) }}
                      disabled={!selectedClientId || assignMutation.isPending}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors whitespace-nowrap shadow-sm"
                    >
                      {assignMutation.isPending
                        ? <Loader2 size={13} className="animate-spin" />
                        : <PlusCircle size={13} />}
                      {assignMutation.isPending ? 'Assigning…' : 'Assign Client'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50">
                    All published clients are already assigned to this engineer.
                  </p>
                )}
              </div>

              {/* Per-client assignment list */}
              {myRequests.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Current Assignments
                  </p>
                  {myRequests.map(req => {
                    const cfg = TR_STATUS[req.status] ?? {
                      bg: 'bg-muted/50', text: 'text-muted-foreground', dot: 'bg-muted-foreground', label: req.status,
                    }
                    const result = myResults.find(r => r.client_id === req.client_id)
                    const score = result ? (result.overall_score ?? result.knowledge_score ?? null) : null
                    return (
                      <div
                        key={req.id}
                        className="flex items-center gap-3 bg-card rounded-xl px-4 py-2.5 border border-border/40"
                      >
                        <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
                        <p className="flex-1 text-sm font-medium text-foreground truncate">
                          {req.client_name ?? req.client_id}
                        </p>
                        <span className={cn(
                          'text-xs font-medium px-2.5 py-1 rounded-full shrink-0',
                          cfg.bg, cfg.text,
                        )}>
                          {cfg.label}
                        </span>
                        {score != null && (
                          <span className={cn(
                            'text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1',
                            score >= 70
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400',
                          )}>
                            {score >= 70
                              ? <CheckCircle2 size={11} />
                              : <XCircle size={11} />}
                            {score}%
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/50 shrink-0">
                          {new Date(req.requested_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 pl-1">No clients assigned yet.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function ControlPanelPage() {
  const { data: engineers = [], isLoading: engLoading } = useQuery({
    queryKey: ['admin-engineers'],
    queryFn: listEngineers,
  })
  const { data: allRequests = [] } = useQuery({
    queryKey: ['admin-all-requests'],
    queryFn: () => listAdminTestRequests(),
  })
  const { data: allResults = [] } = useQuery({
    queryKey: ['admin-results'],
    queryFn: () => listAdminResults(),
  })
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => listClients({ status: 'published' }),
  })

  const publishedClients = allClients.map(c => ({ id: c.id, name: c.name }))

  const totalAssignments = allRequests.length
  const completedAll = allRequests.filter(r => r.status === 'completed').length
  const avgScore = allResults.length
    ? Math.round(allResults.reduce((s, r) => s + (r.overall_score ?? r.knowledge_score ?? 0), 0) / allResults.length)
    : null
  const passRate = allResults.length
    ? Math.round(
        (allResults.filter(r => (r.overall_score ?? r.knowledge_score ?? 0) >= 70).length / allResults.length) * 100
      )
    : null

  const stats = [
    { label: 'Total Engineers',    value: engineers.length,                        color: 'from-orange-400 to-red-500',    icon: Users },
    { label: 'Assignments',        value: totalAssignments,                        color: 'from-indigo-400 to-blue-500',   icon: ClipboardList },
    { label: 'Tests Completed',    value: completedAll,                            color: 'from-emerald-400 to-teal-500',  icon: CheckCircle2 },
    { label: 'Overall Pass Rate',  value: passRate != null ? `${passRate}%` : '—', color: 'from-violet-400 to-purple-500', icon: BarChart2 },
  ]

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="flex items-center gap-4"
      >
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Admin Control Panel</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Assign clients, track progress, and monitor all engineers in one place
          </p>
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE, delay: 0.06 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm', color)}>
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Engineer table */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE, delay: 0.12 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        {/* Table header */}
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Engineers & Assignments</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click the <span className="text-orange-400 font-semibold">Assign</span> button on any engineer row to assign a client
            </p>
          </div>
          {avgScore != null && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-xl">
              <BarChart2 size={12} />
              Overall avg: <span className={cn('font-bold', avgScore >= 70 ? 'text-emerald-400' : 'text-red-400')}>{avgScore}%</span>
            </div>
          )}
        </div>

        {engLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={26} className="animate-spin text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Loading engineers…</p>
          </div>
        ) : engineers.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Users size={26} className="text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No engineers yet</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Engineers will appear here once they sign up and are promoted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Engineer
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Avg Score
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {engineers.map(eng => (
                  <EngineerRow
                    key={eng.id}
                    engineer={eng}
                    requests={allRequests}
                    results={allResults}
                    publishedClients={publishedClients}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
