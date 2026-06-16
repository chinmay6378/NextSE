'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ArrowRight, Users } from 'lucide-react'
import { listClients } from '@/lib/api/clients'
import { ClientLearning } from './client-learning'

export function StudyHub() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', 'published'],
    queryFn: () => listClients({ status: 'published' }),
  })

  if (selectedClientId) {
    const client = clients?.find((c) => c.id === selectedClientId)
    if (client) {
      return (
        <div>
          <button
            onClick={() => setSelectedClientId(null)}
            className="mb-6 flex items-center gap-2 px-4 py-2 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            ← Back to Clients
          </button>
          <ClientLearning clientId={selectedClientId} clientName={client.name} />
        </div>
      )
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Study Hub</h1>
        <p className="text-muted-foreground mt-1">Select a client to study their profile and materials</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Clients List */}
      {!isLoading && (clients?.length ?? 0) === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Users className="mx-auto mb-3 text-muted-foreground" size={40} />
          <p className="text-foreground font-semibold mb-2">No Clients Available</p>
          <p className="text-muted-foreground">An admin needs to publish a client profile before you can start studying.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clients?.map((client, idx) => (
            <motion.button
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedClientId(client.id)}
              className="text-left bg-card border border-border rounded-xl p-6 hover:border-primary transition-colors group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{client.name}</h3>
                    <p className="text-muted-foreground text-sm">{client.industry}</p>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors" size={24} />
                </div>

                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <BookOpen size={16} />
                  Start Learning
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
