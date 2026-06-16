'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, FlipHorizontal, FileText, Megaphone, ChevronRight, CheckCircle2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import { getEngineerProgress, getSalesPitch, getStudyMaterial, updateEngineerProgress } from '@/lib/api/study'
import type { StudyMaterialContent } from '@/lib/api/types'

interface ClientLearningProps {
  clientId: string
  clientName: string
}

type SelectedItem =
  | { kind: 'module'; sectionId: string; title: string; content: string }
  | { kind: 'flashcard'; sectionId: string; front: string; back: string }
  | { kind: 'cheat-sheet'; sectionId: string; content: string }

export function ClientLearning({ clientId, clientName }: ClientLearningProps) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [flipped, setFlipped] = useState(false)

  const { data: studyMaterial, isLoading: materialLoading } = useQuery({
    queryKey: ['study-material', clientId],
    queryFn: () => getStudyMaterial(clientId),
  })

  const { data: salesPitch } = useQuery({
    queryKey: ['sales-pitch', clientId],
    queryFn: () => getSalesPitch(clientId),
  })

  const { data: progress } = useQuery({
    queryKey: ['engineer-progress', clientId],
    queryFn: () => getEngineerProgress(clientId),
  })

  const markStudied = useMutation({
    mutationFn: (sectionId: string) => updateEngineerProgress(clientId, sectionId, true),
    onSuccess: (data) => queryClient.setQueryData(['engineer-progress', clientId], data),
  })

  const content = studyMaterial?.content_json as StudyMaterialContent | undefined
  const modules = content?.modules ?? []
  const flashcards = content?.flashcards ?? []
  const cheatSheet = content?.cheat_sheet

  const studiedSections = progress?.studied_sections ?? {}
  const percentComplete = Math.round(progress?.studied_percent ?? 0)

  const handleComplete = () => {
    if (selected) {
      markStudied.mutate(selected.sectionId)
      setSelected(null)
    }
  }

  if (materialLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-xl">
        <BookOpen className="mx-auto mb-3 text-muted-foreground" size={40} />
        <p className="text-foreground font-semibold mb-2">Study material isn&apos;t ready yet</p>
        <p className="text-muted-foreground">Check back once an admin has generated it for {clientName}.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Learning Materials: {clientName}</h1>
        <p className="text-muted-foreground mt-1">Study comprehensive materials to master this client</p>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Learning Progress</h3>
          <span className="text-2xl font-bold text-primary">{percentComplete}%</span>
        </div>
        <div className="w-full bg-background rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentComplete}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-primary to-accent"
          />
        </div>
      </div>

      {/* Learning Modal */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-96 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              {selected.kind === 'flashcard' ? (
                <motion.div
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="min-h-64 bg-gradient-to-br from-primary to-secondary rounded-lg p-8 flex flex-col justify-center items-center cursor-pointer text-center"
                  onClick={() => setFlipped(!flipped)}
                >
                  <p className="text-sm text-primary-foreground/80 mb-4">{flipped ? 'Answer' : 'Question'}</p>
                  <p className="text-2xl font-bold text-primary-foreground">
                    {flipped ? selected.back : selected.front}
                  </p>
                  <p className="text-xs text-primary-foreground/60 mt-8">Click to flip</p>
                </motion.div>
              ) : (
                <>
                  {selected.kind === 'module' && (
                    <h2 className="text-2xl font-bold text-foreground mb-4">{selected.title}</h2>
                  )}
                  <p className="text-foreground whitespace-pre-wrap">{selected.content}</p>
                </>
              )}

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleComplete}
                  className="flex-1 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Mark as Complete
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Learning Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Modules */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-foreground">Learning Modules</h2>
          </div>
          <div className="space-y-3">
            {modules.map((module, idx) => {
              const sectionId = `module-${idx}`
              return (
                <motion.div
                  key={sectionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() =>
                    setSelected({ kind: 'module', sectionId, title: module.title, content: module.content })
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        {studiedSections[sectionId] && <CheckCircle2 size={18} className="text-accent" />}
                        {module.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{module.content}</p>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Flashcards */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FlipHorizontal className="text-secondary" size={24} />
            <h2 className="text-xl font-bold text-foreground">Flashcards</h2>
          </div>
          <div className="space-y-3">
            {flashcards.map((card, idx) => {
              const sectionId = `flashcard-${idx}`
              return (
                <motion.div
                  key={sectionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/50 rounded-lg p-4 hover:border-secondary transition-colors cursor-pointer"
                  onClick={() => {
                    setFlipped(false)
                    setSelected({ kind: 'flashcard', sectionId, front: card.front, back: card.back })
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Question</p>
                      <h3 className="font-semibold text-foreground line-clamp-2">{card.front}</h3>
                    </div>
                    {studiedSections[sectionId] && (
                      <CheckCircle2 size={18} className="text-accent flex-shrink-0 ml-2" />
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Cheat Sheet */}
        {cheatSheet && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="text-amber-400" size={24} />
              <h2 className="text-xl font-bold text-foreground">Quick Reference</h2>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-400/10 border border-amber-400/50 rounded-lg p-4 hover:border-amber-400 transition-colors cursor-pointer"
              onClick={() => setSelected({ kind: 'cheat-sheet', sectionId: 'cheat-sheet', content: cheatSheet })}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {studiedSections['cheat-sheet'] && <CheckCircle2 size={18} className="text-accent" />}
                    Cheat Sheet
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cheatSheet}</p>
                </div>
                <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 ml-2" />
              </div>
            </motion.div>
          </section>
        )}

        {/* Sales Pitch — supplementary reading, not progress-tracked */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="text-accent" size={24} />
            <h2 className="text-xl font-bold text-foreground">Sample Sales Pitch</h2>
          </div>
          {salesPitch?.content_markdown ? (
            <div className="bg-card border border-border rounded-lg p-4 prose prose-invert prose-sm max-w-none max-h-80 overflow-auto">
              <ReactMarkdown>{salesPitch.content_markdown}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not generated yet.</p>
          )}
        </section>
      </div>

      {/* Summary */}
      {percentComplete === 100 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-accent/20 border border-accent rounded-xl p-6 text-center"
        >
          <CheckCircle2 className="mx-auto mb-3 text-accent" size={32} />
          <h3 className="text-xl font-bold text-foreground mb-2">Learning Complete!</h3>
          <p className="text-muted-foreground">
            You&apos;re ready to take the test. Visit the Test Flow section to begin.
          </p>
        </motion.div>
      )}
    </div>
  )
}
