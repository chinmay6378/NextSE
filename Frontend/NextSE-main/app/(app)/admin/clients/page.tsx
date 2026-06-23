'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Building2, Plus } from 'lucide-react'
import Link from 'next/link'

import { listClients } from '@/lib/api/clients'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700',
}

export default function AdminClientsPage() {
  const { data: clients, isLoading, isError } = useQuery({
    queryKey: ['clients', 'admin-list'],
    queryFn: () => listClients(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-muted-foreground mt-2">Onboard clients and generate sales training material</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg hover:shadow-primary/20 transition-all"
        >
          <Plus size={18} />
          New Client
        </Link>
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
            >
              <Link
                href={`/admin/clients/${client.id}`}
                className="block bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors h-full"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Building2 size={20} className="text-primary" />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full capitalize',
                      statusStyles[client.status]
                    )}
                  >
                    {client.status}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">{client.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{client.industry}</p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
