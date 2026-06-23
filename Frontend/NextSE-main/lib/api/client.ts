import { createClient } from '@/lib/supabase/client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  // Race against 3s timeout so API calls never hang waiting for token refresh
  const result = await Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 3000)
    ),
  ])
  const token = result.data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
  body?: unknown
  isFormData?: boolean
  searchParams?: Record<string, string | undefined>
}

function extractMessage(detail: unknown, status: number): string {
  if (detail && typeof detail === 'object' && 'detail' in detail) {
    const inner = (detail as { detail?: unknown }).detail
    if (typeof inner === 'string') return inner
  }
  return `Request failed (${status})`
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeaders()) }
  let body: BodyInit | undefined

  if (options.body !== undefined) {
    if (options.isFormData) {
      body = options.body as FormData
    } else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(options.body)
    }
  }

  let url = `${API_BASE_URL}${path}`
  if (options.searchParams) {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(options.searchParams)) {
      if (value !== undefined) search.set(key, value)
    }
    const qs = search.toString()
    if (qs) url += `?${qs}`
  }

  const response = await fetch(url, { method: options.method ?? 'GET', headers, body })

  if (!response.ok) {
    let detail: unknown
    try {
      detail = await response.json()
    } catch {
      detail = undefined
    }
    throw new ApiError(response.status, extractMessage(detail, response.status), detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
