'use client'

import { LearningMaterial } from './mock-llm'

// Still localStorage-backed mocks — Phase 2 replaces both with real endpoints
// (GET /clients/{id}/study-material, PATCH /engineer-progress/{client_id}).
const STORAGE_KEYS = {
  MATERIALS: 'salesprep_materials',
  LEARNING_PROGRESS: 'salesprep_learning_progress',
}

// Learning Materials
export const materialStore = {
  getByClientId: (clientId: string): LearningMaterial[] => {
    if (typeof window === 'undefined') return []
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MATERIALS)
      const materials = data ? JSON.parse(data) : []
      return materials.filter((m: LearningMaterial) => m.clientId === clientId)
    } catch {
      return []
    }
  },
}

// Learning Progress
export const progressStore = {
  getProgress: (userId: string, clientId: string): Record<string, boolean> => {
    if (typeof window === 'undefined') return {}
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.LEARNING_PROGRESS}_${userId}_${clientId}`)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  },

  updateProgress: (userId: string, clientId: string, materialId: string, completed: boolean): void => {
    const progress = progressStore.getProgress(userId, clientId)
    progress[materialId] = completed
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEYS.LEARNING_PROGRESS}_${userId}_${clientId}`, JSON.stringify(progress))
    }
  },
}
