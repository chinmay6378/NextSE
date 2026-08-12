import { apiFetch } from './client'
import type { MCQResult, MCQStartData, Profile, TestRequest } from './types'

// --- Engineer ---

export function listEngineerTestRequests() {
  return apiFetch<TestRequest[]>('/test-requests')
}

export function startTest(requestId: string) {
  return apiFetch<MCQStartData>(`/test-requests/${requestId}/start`, { method: 'POST' })
}

export function submitMCQ(
  requestId: string,
  answers: { question_id: string; selected_option_index: number }[]
) {
  return apiFetch<MCQResult>(`/test-requests/${requestId}/submit-mcq`, {
    method: 'POST',
    body: { answers },
  })
}

// --- Admin ---

export function listAdminTestRequests(params?: {
  engineer_id?: string
  client_id?: string
  status_filter?: string
}) {
  return apiFetch<TestRequest[]>('/admin/test-requests', {
    searchParams: {
      engineer_id: params?.engineer_id,
      client_id: params?.client_id,
      status_filter: params?.status_filter,
    },
  })
}

export function createTestRequest(client_id: string, engineer_id: string) {
  return apiFetch<TestRequest>('/admin/test-requests', {
    method: 'POST',
    body: { client_id, engineer_id },
  })
}

export function approveTestRequest(requestId: string) {
  return apiFetch<TestRequest>(`/admin/test-requests/${requestId}/approve`, { method: 'PATCH' })
}

export function deleteTestRequest(requestId: string) {
  return apiFetch<void>(`/admin/test-requests/${requestId}`, { method: 'DELETE' })
}

export function retakeTestRequest(requestId: string) {
  return apiFetch<TestRequest>(`/admin/test-requests/${requestId}/retake`, { method: 'POST' })
}

export function listEngineers(params?: { includeArchived?: boolean }) {
  return apiFetch<Profile[]>('/admin/users', {
    searchParams: {
      role: 'engineer',
      include_archived: params?.includeArchived ? 'true' : undefined,
    },
  })
}

export function archiveEngineer(profileId: string) {
  return apiFetch<Profile>(`/admin/users/${profileId}/archive`, { method: 'POST' })
}

export function unarchiveEngineer(profileId: string) {
  return apiFetch<Profile>(`/admin/users/${profileId}/unarchive`, { method: 'POST' })
}

export function deleteEngineer(profileId: string) {
  return apiFetch<void>(`/admin/users/${profileId}`, { method: 'DELETE' })
}
