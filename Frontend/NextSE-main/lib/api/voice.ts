import { apiFetch } from './client'
import type { VoiceScoreOut, VoiceSessionOut, VoiceTurnOut } from './types'

export function startVoiceSession(requestId: string) {
  return apiFetch<VoiceSessionOut>(`/test-requests/${requestId}/voice/start`, { method: 'POST' })
}

export function submitVoiceTurn(sessionId: string, audioBlob: Blob) {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.wav')
  return apiFetch<VoiceTurnOut>(`/voice-sessions/${sessionId}/turn`, {
    method: 'POST',
    body: form,
    isFormData: true,
  })
}

export function endVoiceSession(sessionId: string) {
  return apiFetch<VoiceScoreOut>(`/voice-sessions/${sessionId}/end`, { method: 'POST' })
}

export interface DemoTurnOut {
  transcription: string
  ai_response: string
  ai_audio_b64?: string
}

export async function getDemoOpening(): Promise<{ audio_b64: string | null }> {
  return apiFetch<{ audio_b64: string | null }>('/voice/demo/opening', { method: 'GET' })
}

export async function submitDemoTurn(
  audioBlob: Blob,
  clientId: string,
  conversation: { speaker: string; message: string }[],
): Promise<DemoTurnOut> {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.wav')
  form.append('client_id', clientId)
  form.append('conversation_json', JSON.stringify(conversation))
  return apiFetch<DemoTurnOut>('/voice/demo/turn', {
    method: 'POST',
    body: form,
    isFormData: true,
  })
}

export async function scoreDemoSession(
  clientId: string,
  conversation: { speaker: string; message: string }[],
): Promise<VoiceScoreOut> {
  const form = new FormData()
  form.append('client_id', clientId)
  form.append('conversation_json', JSON.stringify(conversation))
  return apiFetch<VoiceScoreOut>('/voice/demo/score', {
    method: 'POST',
    body: form,
    isFormData: true,
  })
}
