'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Loader2, Send, Sparkles, User } from 'lucide-react'
import { askChatbot, type ChatMessage } from '@/lib/api/chatbot'

const SUGGESTIONS = [
  'What are the key products and their features?',
  'What are the pricing tiers?',
  'Who is the ideal buyer / target customer?',
  'What are the top objections and how to handle them?',
  'Who are the main competitors?',
]

interface Props {
  clientId: string
  clientName: string
}

export function ClientChatbot({ clientId, clientName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (question: string) => {
    const q = question.trim()
    if (!q || loading) return

    const userMsg: ChatMessage = { role: 'user', content: q }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const res = await askChatbot(clientId, q, messages)
      setMessages([...next, { role: 'assistant', content: res.answer }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get an answer. Try again.')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[600px] bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-violet-50 to-indigo-50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">AI Knowledge Assistant</p>
          <p className="text-xs text-muted-foreground">{clientName} · answers from uploaded documents</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-600 font-medium">Ready</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Welcome / empty state */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center py-6 space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 border border-violet-200 flex items-center justify-center mx-auto">
                <Sparkles size={24} className="text-violet-600" />
              </div>
              <p className="font-semibold text-foreground text-sm">Ask anything about {clientName}</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                I have access to all uploaded documents — product specs, pricing, case studies, and more.
              </p>
            </div>

            {/* Suggestion chips */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-center">Try asking</p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => send(s)}
                    className="text-left text-sm px-4 py-2.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 hover:border-violet-300 transition-all font-medium"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Chat messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm border border-border'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <User size={13} className="text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5 justify-start"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-muted border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Searching documents…</span>
            </div>
          </motion.div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-3 py-2 text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-muted/30">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about products, pricing, competitors…"
            rows={1}
            className="flex-1 resize-none bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all min-h-[42px] max-h-[120px] overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
            disabled={loading}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ boxShadow: '0 4px 14px oklch(0.618 0.195 38 / 0.3)' }}
          >
            <Send size={16} />
          </motion.button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
