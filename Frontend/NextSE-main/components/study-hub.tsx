'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ArrowRight, Users } from 'lucide-react'
import { clientStore } from '@/lib/data-store'
import { ClientLearning } from './client-learning'

export function StudyHub() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clients] = useState(clientStore.getAll())

  if (selectedClientId) {
    const client = clients.find(c => c.id === selectedClientId)
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

      {/* Clients List */}
      {clients.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Users className="mx-auto mb-3 text-muted-foreground" size={40} />
          <p className="text-foreground font-semibold mb-2">No Clients Available</p>
          <p className="text-muted-foreground">Your manager needs to create client profiles before you can start studying.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clients.map((client, idx) => (
            <motion.button
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedClientId(client.id)}
              className="text-left bg-card border border-border rounded-xl p-6 hover:border-primary transition-colors group"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{client.name}</h3>
                    <p className="text-muted-foreground text-sm">{client.industry}</p>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors" size={24} />
                </div>

                {/* Description */}
                <p className="text-foreground text-sm line-clamp-2">{client.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <p className="text-foreground font-semibold">{client.products.length}</p>
                    <p className="text-muted-foreground text-xs">Products</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <p className="text-foreground font-semibold">{client.services.length}</p>
                    <p className="text-muted-foreground text-xs">Services</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <p className="text-foreground font-semibold">{client.competitors.length}</p>
                    <p className="text-muted-foreground text-xs">Competitors</p>
                  </div>
                </div>

                {/* Key Points */}
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Key Points</p>
                  <ul className="space-y-1">
                    {client.keyPoints.slice(0, 2).map((point, i) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
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


