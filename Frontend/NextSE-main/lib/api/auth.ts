import { apiFetch } from './client'
import type { Profile } from './types'

export function signup(payload: { email: string; password: string; full_name: string }) {
  return apiFetch<Profile>('/auth/signup', { method: 'POST', body: payload })
}

export function getMe() {
  return apiFetch<Profile>('/me')
}
