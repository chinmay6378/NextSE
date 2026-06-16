'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, FlipHorizontal, Eye, FileText, ChevronRight, CheckCircle2 } from 'lucide-react'
import { materialStore, progressStore } from '@/lib/data-store'
import { useAuth } from '@/lib/auth'
import type { LearningMaterial } from '@/lib/mock-llm'

interface ClientLearningProps {
  clientId: string
  clientName: string
}

// Materials/progress are still localStorage-backed mocks — Phase 2 replaces
// this with GET /clients/{id}/study-material + PATCH /engineer-progress/{id}.
export function ClientLearning({ clientId, clientName }: ClientLearningProps) {
  const { profile } = useAuth()
  const [materials] = useState<LearningMaterial[]>(materialStore.getByClientId(clientId))
  const [selectedMaterial, setSelectedMaterial] = useState<LearningMaterial | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [completed, setCompleted] = useState(() => progressStore.getProgress(profile?.id || '', clientId))

  const modules = materials.filter(m => m.type === 'module')
  const flashcards = materials.filter(m => m.type === 'flashcard')
  const visualAids = materials.filter(m => m.type === 'visual-aid')
  const cheatSheets = materials.filter(m => m.type === 'cheat-sheet')

  const handleMaterialComplete = (materialId: string) => {
    if (profile) {
      progressStore.updateProgress(profile.id, clientId, materialId, true)
      setCompleted(prev => ({ ...prev, [materialId]: true }))
    }
  }

  const completionStats = {
    modules: modules.filter(m => completed[m.id]).length,
    flashcards: flashcards.filter(m => completed[m.id]).length,
    visual: visualAids.filter(m => completed[m.id]).length,
    cheat: cheatSheets.filter(m => completed[m.id]).length
  }

  const totalCompleted = Object.values(completionStats).reduce((a, b) => a + b, 0)
  const totalMaterials = materials.length
  const percentComplete = Math.round((totalCompleted / totalMaterials) * 100)

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
        <p className="text-sm text-muted-foreground mt-2">{totalCompleted} of {totalMaterials} materials completed</p>
      </div>

      {/* Learning Modal */}
      {selectedMaterial && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMaterial(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-96 overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8">
              {selectedMaterial.type === 'flashcard' ? (
                <motion.div
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="min-h-64 bg-gradient-to-br from-primary to-secondary rounded-lg p-8 flex flex-col justify-center items-center cursor-pointer text-center"
                  onClick={() => setFlipped(!flipped)}
                >
                  <p className="text-sm text-primary-foreground/80 mb-4">{flipped ? 'Answer' : 'Question'}</p>
                  <p className="text-2xl font-bold text-primary-foreground">
                    {flipped ? selectedMaterial.content : selectedMaterial.title}
                  </p>
                  <p className="text-xs text-primary-foreground/60 mt-8">Click to flip</p>
                </motion.div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-foreground mb-4">{selectedMaterial.title}</h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-foreground whitespace-pre-wrap">{selectedMaterial.content}</p>
                  </div>
                </>
              )}

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    handleMaterialComplete(selectedMaterial.id)
                    setSelectedMaterial(null)
                  }}
                  className="flex-1 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Mark as Complete
                </button>
                <button
                  onClick={() => setSelectedMaterial(null)}
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
            <span className="text-sm text-muted-foreground">({completionStats.modules}/{modules.length})</span>
          </div>

          <div className="space-y-3">
            {modules.map((module, idx) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedMaterial(module)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {completed[module.id] && <CheckCircle2 size={18} className="text-accent" />}
                      {module.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{module.content}</p>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 ml-2" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Flashcards */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FlipHorizontal className="text-secondary" size={24} />
            <h2 className="text-xl font-bold text-foreground">Flashcards</h2>
            <span className="text-sm text-muted-foreground">({completionStats.flashcards}/{flashcards.length})</span>
          </div>

          <div className="space-y-3">
            {flashcards.map((card, idx) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/50 rounded-lg p-4 hover:border-secondary transition-colors cursor-pointer"
                onClick={() => {
                  setFlipped(false)
                  setSelectedMaterial(card)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Question</p>
                    <h3 className="font-semibold text-foreground line-clamp-2">{card.title}</h3>
                  </div>
                  {completed[card.id] && <CheckCircle2 size={18} className="text-accent flex-shrink-0 ml-2" />}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Visual Aids */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="text-accent" size={24} />
            <h2 className="text-xl font-bold text-foreground">Visual Aids</h2>
            <span className="text-sm text-muted-foreground">({completionStats.visual}/{visualAids.length})</span>
          </div>

          <div className="space-y-3">
            {visualAids.map((aid, idx) => (
              <motion.div
                key={aid.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedMaterial(aid)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {completed[aid.id] && <CheckCircle2 size={18} className="text-accent" />}
                      {aid.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{aid.content}</p>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 ml-2" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Cheat Sheets */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="text-amber-400" size={24} />
            <h2 className="text-xl font-bold text-foreground">Quick Reference</h2>
            <span className="text-sm text-muted-foreground">({completionStats.cheat}/{cheatSheets.length})</span>
          </div>

          <div className="space-y-3">
            {cheatSheets.map((sheet, idx) => (
              <motion.div
                key={sheet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-amber-400/10 border border-amber-400/50 rounded-lg p-4 hover:border-amber-400 transition-colors cursor-pointer"
                onClick={() => setSelectedMaterial(sheet)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {completed[sheet.id] && <CheckCircle2 size={18} className="text-accent" />}
                      {sheet.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sheet.content}</p>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 ml-2" />
                </div>
              </motion.div>
            ))}
          </div>
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
          <p className="text-muted-foreground">You&apos;re ready to take the test. Visit the Test Flow section to begin.</p>
        </motion.div>
      )}
    </div>
  )
}
