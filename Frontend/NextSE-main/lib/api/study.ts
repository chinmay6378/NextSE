import { apiFetch } from './client'
import type { EngineerProgress, GeneratedContent } from './types'

export function getStudyMaterial(clientId: string) {
  return apiFetch<GeneratedContent>(`/clients/${clientId}/study-material`)
}

export function getSalesPitch(clientId: string) {
  return apiFetch<GeneratedContent>(`/clients/${clientId}/sales-pitch`)
}

export function getEngineerProgress(clientId: string) {
  return apiFetch<EngineerProgress>(`/engineer-progress/${clientId}`)
}

export function updateEngineerProgress(clientId: string, sectionId: string, studied: boolean) {
  return apiFetch<EngineerProgress>(`/engineer-progress/${clientId}`, {
    method: 'PATCH',
    body: { section_id: sectionId, studied },
  })
}
