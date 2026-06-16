'use client'

import { ClientProfile, LearningMaterial, MCQQuestion, VoiceScenario, TestResult } from './mock-llm'

const STORAGE_KEYS = {
  CLIENTS: 'salesprep_clients',
  MATERIALS: 'salesprep_materials',
  MCQ_QUESTIONS: 'salesprep_mcq_questions',
  VOICE_SCENARIOS: 'salesprep_voice_scenarios',
  TEST_RESULTS: 'salesprep_test_results',
  LEARNING_PROGRESS: 'salesprep_learning_progress'
}

// Client Management
export const clientStore = {
  getAll: (): ClientProfile[] => {
    if (typeof window === 'undefined') return []
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTS)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  getById: (id: string): ClientProfile | null => {
    const clients = clientStore.getAll()
    return clients.find(c => c.id === id) || null
  },

  add: (profile: ClientProfile): void => {
    const clients = clientStore.getAll()
    clients.push(profile)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients))
    }
  },

  update: (id: string, updates: Partial<ClientProfile>): void => {
    const clients = clientStore.getAll()
    const idx = clients.findIndex(c => c.id === id)
    if (idx !== -1) {
      clients[idx] = { ...clients[idx], ...updates }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients))
      }
    }
  },

  delete: (id: string): void => {
    const clients = clientStore.getAll().filter(c => c.id !== id)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients))
    }
  }
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

  add: (material: LearningMaterial): void => {
    const materials = typeof window !== 'undefined' ? (
      (() => {
        try {
          const data = localStorage.getItem(STORAGE_KEYS.MATERIALS)
          return data ? JSON.parse(data) : []
        } catch {
          return []
        }
      })()
    ) : []
    
    materials.push(material)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials))
    }
  },

  addMultiple: (materials: LearningMaterial[]): void => {
    const existing = typeof window !== 'undefined' ? (
      (() => {
        try {
          const data = localStorage.getItem(STORAGE_KEYS.MATERIALS)
          return data ? JSON.parse(data) : []
        } catch {
          return []
        }
      })()
    ) : []
    
    const all = [...existing, ...materials]
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(all))
    }
  }
}

// MCQ Questions
export const mcqStore = {
  getByClientId: (clientId: string): MCQQuestion[] => {
    if (typeof window === 'undefined') return []
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MCQ_QUESTIONS)
      const questions = data ? JSON.parse(data) : []
      return questions.filter((q: MCQQuestion) => q.clientId === clientId)
    } catch {
      return []
    }
  },

  addMultiple: (questions: MCQQuestion[]): void => {
    const existing = typeof window !== 'undefined' ? (
      (() => {
        try {
          const data = localStorage.getItem(STORAGE_KEYS.MCQ_QUESTIONS)
          return data ? JSON.parse(data) : []
        } catch {
          return []
        }
      })()
    ) : []
    
    const all = [...existing, ...questions]
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MCQ_QUESTIONS, JSON.stringify(all))
    }
  }
}

// Voice Scenarios
export const voiceStore = {
  getByClientId: (clientId: string): VoiceScenario[] => {
    if (typeof window === 'undefined') return []
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VOICE_SCENARIOS)
      const scenarios = data ? JSON.parse(data) : []
      return scenarios.filter((s: VoiceScenario) => s.clientId === clientId)
    } catch {
      return []
    }
  },

  addMultiple: (scenarios: VoiceScenario[]): void => {
    const existing = typeof window !== 'undefined' ? (
      (() => {
        try {
          const data = localStorage.getItem(STORAGE_KEYS.VOICE_SCENARIOS)
          return data ? JSON.parse(data) : []
        } catch {
          return []
        }
      })()
    ) : []
    
    const all = [...existing, ...scenarios]
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.VOICE_SCENARIOS, JSON.stringify(all))
    }
  }
}

// Test Results
export const resultStore = {
  getByUserId: (userId: string): TestResult[] => {
    if (typeof window === 'undefined') return []
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEST_RESULTS)
      const results = data ? JSON.parse(data) : []
      return results.filter((r: TestResult) => r.userId === userId)
    } catch {
      return []
    }
  },

  getByUserAndClient: (userId: string, clientId: string): TestResult[] => {
    const results = resultStore.getByUserId(userId)
    return results.filter(r => r.clientId === clientId)
  },

  add: (result: TestResult): void => {
    const results = typeof window !== 'undefined' ? (
      (() => {
        try {
          const data = localStorage.getItem(STORAGE_KEYS.TEST_RESULTS)
          return data ? JSON.parse(data) : []
        } catch {
          return []
        }
      })()
    ) : []
    
    results.push(result)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TEST_RESULTS, JSON.stringify(results))
    }
  }
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
  }
}
