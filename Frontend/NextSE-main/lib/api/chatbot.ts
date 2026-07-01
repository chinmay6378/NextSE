import { apiFetch } from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  answer: string
}

export function askChatbot(clientId: string, question: string, history: ChatMessage[]) {
  return apiFetch<ChatResponse>(`/clients/${clientId}/chatbot/ask`, {
    method: 'POST',
    body: { question, history },
  })
}

export function reindexClient(clientId: string) {
  return apiFetch<{ status: string }>(`/clients/${clientId}/chatbot/reindex`, {
    method: 'POST',
  })
}
