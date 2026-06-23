'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Building2, Mic, Users } from 'lucide-react'

import { listClients } from '@/lib/api/clients'
import { DemoVoiceAssessment } from '@/components/demo-voice-assessment'
import type { Client } from '@/lib/api/types'

export default function PracticePage() {
  const [selected, setSelected] = useState<Client | null>(null)

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', 'published'],
    queryFn: () => listClients({ status: 'published' }),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                <Mic size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Practice Pitch</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Real-time AI role-play · no formal test required
                </p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-5 space-y-3">
              <p className="text-sm font-semibold text-violet-800">How it works</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { step: '1', label: 'Pick a client' },
                  { step: '2', label: 'Pitch to AI prospect' },
                  { step: '3', label: 'Get scored & feedback' },
                ].map(({ step, label }) => (
                  <div key={step} className="space-y-1.5">
                    <div className="w-8 h-8 rounded-full bg-violet-500 text-white text-sm font-bold flex items-center justify-center mx-auto">
                      {step}
                    </div>
                    <p className="text-xs text-violet-700 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Client selection */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Select a client to practice for</p>

              {isLoading && (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}

              {!isLoading && (!clients || clients.length === 0) && (
                <div className="text-center py-12 bg-card border border-border rounded-2xl">
                  <Users className="mx-auto mb-3 text-muted-foreground" size={36} />
                  <p className="text-foreground font-semibold mb-1.5">No clients available</p>
                  <p className="text-muted-foreground text-sm">
                    An admin needs to publish a client before you can practice.
                  </p>
                </div>
              )}

              {clients && clients.length > 0 && (
                <div className="space-y-2">
                  {clients.map((client, idx) => (
                    <motion.button
                      key={client.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      whileHover={{ x: 4, transition: { duration: 0.15 } }}
                      onClick={() => setSelected(client)}
                      className="w-full flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:bg-muted/30 transition-all group text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {client.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{client.industry}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full shrink-0">
                        <Mic size={10} />
                        Practice
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="session"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <ArrowLeft size={14} />
              Change client
            </button>
            <DemoVoiceAssessment clientId={selected.id} clientName={selected.name} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
