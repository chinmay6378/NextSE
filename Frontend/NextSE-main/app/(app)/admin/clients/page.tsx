'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Archive, ArchiveRestore, Building2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { archiveClient, deleteClient, listClients, unarchiveClient } from '@/lib/api/clients'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700',
}

export default function AdminClientsPage() {
  const queryClient = useQueryClient()
  const [showArchived, setShowArchived] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const { data: clients, isLoading, isError } = useQuery({
    queryKey: ['clients', 'admin-list', showArchived],
    queryFn: () => listClients({ includeArchived: showArchived }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clients', 'admin-list'] })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveClient(id),
    onSuccess: () => { invalidate(); toast.success('Client archived') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not archive'),
  })
  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => unarchiveClient(id),
    onSuccess: () => { invalidate(); toast.success('Client unarchived') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not unarchive'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => { invalidate(); setConfirmingId(null); toast.success('Client deleted') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not delete'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-muted-foreground mt-2">Onboard clients and generate sales training material</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-border"
            />
            Show archived
          </label>
          <Link
            href="/admin/clients/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            <Plus size={18} />
            New Client
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {isError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-destructive text-sm">
          Failed to load clients. Is the backend running?
        </div>
      )}

      {clients && clients.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No clients yet. Create your first one to get started.</p>
        </div>
      )}

      {clients && clients.length > 0 && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {clients.map((client) => (
            <motion.div
              key={client.id}
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className={cn(
                'bg-card border border-border rounded-lg overflow-hidden h-full flex flex-col transition-colors',
                client.archived && 'opacity-60'
              )}
            >
              <Link
                href={`/admin/clients/${client.id}`}
                className="block p-6 flex-1 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {client.archived && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        Archived
                      </span>
                    )}
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full capitalize',
                        statusStyles[client.status]
                      )}
                    >
                      {client.status}
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">{client.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{client.industry}</p>
              </Link>

              <div className="flex items-center gap-2 px-6 py-3 border-t border-border/60">
                {client.archived ? (
                  <button
                    onClick={() => unarchiveMutation.mutate(client.id)}
                    disabled={unarchiveMutation.isPending}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <ArchiveRestore size={13} />
                    Unarchive
                  </button>
                ) : (
                  <button
                    onClick={() => archiveMutation.mutate(client.id)}
                    disabled={archiveMutation.isPending}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <Archive size={13} />
                    Archive
                  </button>
                )}

                <div className="flex-1" />

                {confirmingId === client.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => deleteMutation.mutate(client.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors"
                    >
                      {deleteMutation.isPending ? 'Deleting…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-muted text-muted-foreground border-border hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingId(client.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete client"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
