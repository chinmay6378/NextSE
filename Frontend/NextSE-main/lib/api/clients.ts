import { apiFetch } from './client'
import type {
  Client,
  ClientDetail,
  ClientFile,
  GenerationKickoff,
  GenerationStatus,
} from './types'

export function listClients(params?: { status?: string; industry?: string }) {
  return apiFetch<Client[]>('/clients', {
    searchParams: { status_filter: params?.status, industry: params?.industry },
  })
}

export function getClient(clientId: string) {
  return apiFetch<ClientDetail>(`/clients/${clientId}`)
}

export function createClient(payload: { name: string; industry: string }) {
  return apiFetch<Client>('/clients', { method: 'POST', body: payload })
}

export function uploadClientFiles(clientId: string, files: File[]) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  return apiFetch<ClientFile[]>(`/clients/${clientId}/files`, {
    method: 'POST',
    body: formData,
    isFormData: true,
  })
}

export function deleteClientFile(clientId: string, fileId: string) {
  return apiFetch<void>(`/clients/${clientId}/files/${fileId}`, { method: 'DELETE' })
}

export function generateProfile(clientId: string, customPrompt: string) {
  return apiFetch<GenerationKickoff>(`/clients/${clientId}/generate-profile`, {
    method: 'POST',
    body: { custom_prompt: customPrompt },
  })
}

export function getGenerationStatus(clientId: string) {
  return apiFetch<GenerationStatus>(`/clients/${clientId}/generation-status`)
}

export function patchProfile(
  clientId: string,
  payload: { content_markdown?: string; content_json?: Record<string, unknown> }
) {
  return apiFetch(`/clients/${clientId}/profile`, { method: 'PATCH', body: payload })
}

export function regenerate(clientId: string, payload: { section?: string; custom_prompt?: string }) {
  return apiFetch<GenerationKickoff>(`/clients/${clientId}/regenerate`, { method: 'POST', body: payload })
}

export function publishClient(clientId: string) {
  return apiFetch<Client>(`/clients/${clientId}/publish`, { method: 'POST' })
}
