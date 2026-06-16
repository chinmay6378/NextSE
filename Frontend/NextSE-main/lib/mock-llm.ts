// Still mock — Phase 2 replaces this with GET /clients/{id}/study-material.
export interface LearningMaterial {
  id: string
  clientId: string
  type: 'module' | 'flashcard' | 'visual-aid' | 'cheat-sheet'
  title: string
  content: string
  details?: unknown
}
