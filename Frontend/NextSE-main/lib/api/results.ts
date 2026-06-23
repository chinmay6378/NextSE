import { apiFetch } from './client'
import type { ResultOut } from './types'

export function listAdminResults(params?: { engineer_id?: string; client_id?: string }) {
  return apiFetch<ResultOut[]>('/admin/results', {
    searchParams: {
      engineer_id: params?.engineer_id,
      client_id: params?.client_id,
    },
  })
}

export function listMyResults() {
  return apiFetch<ResultOut[]>('/engineer/results')
}
