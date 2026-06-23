'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  Mic,
  Phone,
  TrendingUp,
} from 'lucide-react'

import { getDemoOpening, scoreDemoSession, submitDemoTurn } from '@/lib/api/voice'
import type { VoiceScoreOut } from '@/lib/api/types'

const TURN_SECONDS = 120
const SILENCE_THRESHOLD = 0.025
const SILENCE_GRACE_MS = 3500
const MIN_RECORDING_MS = 3000
const OPENING = 'Hello? Kaun bol raha hai?'

interface ConversationEntry {
  speaker: 'ai' | 'engineer'
  message: string
}

interface Props {
  clientId: string
  clientName: string
}

type Phase = 'idle' | 'ai-speaking' | 'listening' | 'processing' | 'ending' | 'scored'

// Encode raw PCM chunks as a standard WAV blob (RIFF / PCM 16-bit mono).
// WAV has a trivial 44-byte header — no codec/container weirdness, universally
// accepted by OpenAI and Groq Whisper.
function encodeWAV(chunks: Float32Array[], sampleRate: number): Blob {
  const totalSamples = chunks.reduce((n, c) => n + c.length, 0)
  const buf = new ArrayBuffer(44 + totalSamples * 2)
  const v = new DataView(buf)
  const w = (o: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))

  w(0, 'RIFF')
  v.setUint32(4, 36 + totalSamples * 2, true)
  w(8, 'WAVE')
  w(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)               // PCM
  v.setUint16(22, 1, true)               // Mono
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true)  // ByteRate
  v.setUint16(32, 2, true)               // BlockAlign
  v.setUint16(34, 16, true)              // BitsPerSample
  w(36, 'data')
  v.setUint32(40, totalSamples * 2, true)

  let o = 44
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const s = Math.max(-1, Math.min(1, chunk[i]))
      v.setInt16(o, s * (s < 0 ? 0x8000 : 0x7fff), true)
      o += 2
    }
  }
  return new Blob([buf], { type: 'audio/wav' })
}

// ---------------------------------------------------------------------------
// AI Avatar
// ---------------------------------------------------------------------------

function AIAvatar({ phase, audioLevel }: { phase: Phase; audioLevel: number }) {
  const isSpeaking = phase === 'ai-speaking'
  const isListening = phase === 'listening'
  const isProcessing = phase === 'processing'
  const isIdle = phase === 'idle'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      {isSpeaking && (
        <>
          <span className="absolute inset-0 rounded-full bg-violet-400/25 animate-ping" />
          <span
            className="absolute rounded-full bg-violet-300/15 animate-ping"
            style={{ inset: -10, animationDelay: '0.35s', animationDuration: '1.8s' }}
          />
        </>
      )}

      {isListening && (
        <span
          className="absolute inset-[-6px] rounded-full border-2 border-orange-400/60 transition-shadow duration-75"
          style={{
            boxShadow: `0 0 ${8 + audioLevel * 22}px rgba(251,146,60,${0.25 + audioLevel * 0.55})`,
          }}
        />
      )}

      <motion.div
        animate={isSpeaking ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={isSpeaking ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {}}
        className={`w-36 h-36 rounded-full flex items-center justify-center shadow-2xl select-none
          bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700
          ${isSpeaking ? 'ring-4 ring-violet-400 ring-offset-2 ring-offset-background' : ''}
          ${isListening ? 'ring-4 ring-orange-400 ring-offset-2 ring-offset-background' : ''}
          ${isIdle ? 'opacity-60' : ''}
        `}
      >
        <Bot size={58} className="text-white/90" />
      </motion.div>

      {isSpeaking && (
        <div className="absolute flex items-end gap-[3px]" style={{ bottom: 4 }}>
          {[0.55, 0.9, 0.65, 1, 0.7, 0.85, 0.5].map((s, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-violet-300"
              animate={{ height: ['3px', `${9 * s}px`, '3px'] }}
              transition={{ duration: 0.4 + i * 0.05, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }}
            />
          ))}
        </div>
      )}

      {isListening && audioLevel > 0.04 && (
        <div className="absolute flex items-end gap-[3px]" style={{ bottom: 4 }}>
          {[0.6, 1, 0.75, 1.1, 0.65].map((s, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-orange-300 transition-all duration-75"
              style={{ height: `${3 + audioLevel * 18 * s}px` }}
            />
          ))}
        </div>
      )}

      {isListening && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shadow-lg"
          style={{ boxShadow: `0 0 ${8 + audioLevel * 16}px rgba(249,115,22,${0.4 + audioLevel * 0.4})` }}
        >
          <Mic size={16} className="text-white" />
        </motion.div>
      )}

      {isProcessing && (
        <span className="absolute inset-0 rounded-full bg-violet-400/10 animate-pulse" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo voice assessment
// ---------------------------------------------------------------------------

export function DemoVoiceAssessment({ clientId, clientName }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [conversation, setConversation] = useState<ConversationEntry[]>([
    { speaker: 'ai', message: OPENING },
  ])
  const [score, setScore] = useState<VoiceScoreOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS)
  const [audioLevel, setAudioLevel] = useState(0)

  const phaseRef = useRef<Phase>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const conversationRef = useRef<ConversationEntry[]>([{ speaker: 'ai', message: OPENING }])

  // PCM recording refs (replace MediaRecorder)
  const streamRef = useRef<MediaStream | null>(null)
  const pcmChunksRef = useRef<Float32Array[]>([])
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sampleRateRef = useRef<number>(48000)
  const recordingStartRef = useRef<number>(0)

  const startListeningRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const stopAndSendRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const submittingRef = useRef(false)

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
  }, [])

  const stopRecording = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
  }, [])

  const playAudio = (b64: string): Promise<void> =>
    new Promise((resolve) => {
      const el = new Audio(`data:audio/mp3;base64,${b64}`)
      audioRef.current = el
      el.onended = () => resolve()
      el.onerror = () => resolve()
      el.onpause = () => {
        if (phaseRef.current === 'ending' || phaseRef.current === 'scored') resolve()
      }
      el.play().catch(() => resolve())
    })

  const speakOpening = (): Promise<void> =>
    new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return }
      const utt = new SpeechSynthesisUtterance(OPENING)
      utt.onend = () => resolve()
      utt.onerror = () => resolve()
      window.speechSynthesis.speak(utt)
    })

  const stopAndSend = useCallback(async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    clearTimers()
    setPhaseSync('processing')
    setAudioLevel(0)

    stopRecording()

    const pcmChunks = [...pcmChunksRef.current]
    pcmChunksRef.current = []
    const blob = encodeWAV(pcmChunks, sampleRateRef.current)

    if (blob.size < 200) {
      setError('No speech detected — please speak clearly and try again.')
      await new Promise(r => setTimeout(r, 1500))
      submittingRef.current = false
      if (phaseRef.current !== 'ending' && phaseRef.current !== 'scored') {
        await startListeningRef.current()
      }
      return
    }

    try {
      const result = await submitDemoTurn(blob, clientId, conversationRef.current)
      const updated: ConversationEntry[] = [
        ...conversationRef.current,
        { speaker: 'engineer', message: result.transcription },
        { speaker: 'ai', message: result.ai_response },
      ]
      conversationRef.current = updated
      setConversation(updated)
      setError(null)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)

      if (result.ai_audio_b64 && phaseRef.current !== 'ending' && phaseRef.current !== 'scored') {
        setPhaseSync('ai-speaking')
        await playAudio(result.ai_audio_b64)
      }

      submittingRef.current = false
      if (phaseRef.current !== 'ending' && phaseRef.current !== 'scored') {
        await startListeningRef.current()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process audio')
      await new Promise(r => setTimeout(r, 2500))
      submittingRef.current = false
      if (phaseRef.current !== 'ending' && phaseRef.current !== 'scored') {
        await startListeningRef.current()
      }
    }
  }, [clientId, clearTimers, setPhaseSync, stopRecording])

  const startListening = useCallback(async () => {
    if (phaseRef.current === 'ending' || phaseRef.current === 'scored') return
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      sampleRateRef.current = ctx.sampleRate
      const source = ctx.createMediaStreamSource(stream)

      // Analyser for silence detection + audio level visualisation
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      // ScriptProcessor captures raw PCM — avoids WebM container/codec issues.
      // Route through a silent gain node (gain=0) so onaudioprocess fires without
      // feeding mic audio into speakers (which causes feedback + false silence triggers).
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      processor.onaudioprocess = (e) => {
        if (phaseRef.current === 'listening') {
          pcmChunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)))
        }
      }
      const silentGain = ctx.createGain()
      silentGain.gain.value = 0
      source.connect(processor)
      processor.connect(silentGain)
      silentGain.connect(ctx.destination)

      // Drain the first 350 ms — discards room echo from the AI's last audio
      // before arming the silence gate and PCM capture.
      await new Promise(r => setTimeout(r, 350))
      if (phaseRef.current === 'ending' || phaseRef.current === 'scored') return
      pcmChunksRef.current = []
      recordingStartRef.current = Date.now()

      const data = new Uint8Array(analyser.frequencyBinCount)
      let silentSince: number | null = null
      let hasSpoken = false

      const tick = () => {
        if (phaseRef.current !== 'listening') return
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const vv = (data[i] - 128) / 128
          sum += vv * vv
        }
        const rms = Math.sqrt(sum / data.length)
        setAudioLevel(Math.min(rms * 5, 1))

        if (rms >= SILENCE_THRESHOLD) {
          hasSpoken = true
          silentSince = null
        } else if (hasSpoken) {
          if (silentSince === null) silentSince = Date.now()
          else if (
            Date.now() - silentSince > SILENCE_GRACE_MS &&
            Date.now() - recordingStartRef.current > MIN_RECORDING_MS
          ) {
            stopAndSendRef.current()
            return
          }
        }
        animFrameRef.current = requestAnimationFrame(tick)
      }
      animFrameRef.current = requestAnimationFrame(tick)

      setTimeLeft(TURN_SECONDS)
      setPhaseSync('listening')

      let remaining = TURN_SECONDS
      timerRef.current = setInterval(() => {
        remaining -= 1
        setTimeLeft(remaining)
        if (remaining <= 0) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          stopAndSendRef.current()
        }
      }, 1000)
    } catch {
      setError('Microphone access denied — please allow microphone and refresh.')
    }
  }, [setPhaseSync])

  useEffect(() => { stopAndSendRef.current = stopAndSend }, [stopAndSend])
  useEffect(() => { startListeningRef.current = startListening }, [startListening])

  useEffect(() => {
    return () => {
      // Signal all in-flight async chains to abort at their next phase check
      phaseRef.current = 'ending'
      submittingRef.current = false
      clearTimers()
      window.speechSynthesis?.cancel()
      audioRef.current?.pause()
      processorRef.current?.disconnect()
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStart = useCallback(async () => {
    setPhaseSync('ai-speaking')
    try {
      const { audio_b64 } = await getDemoOpening()
      if (audio_b64) {
        await playAudio(audio_b64)
      } else {
        await speakOpening()
      }
    } catch {
      await speakOpening()
    }
    await startListeningRef.current()
  }, [setPhaseSync])

  const handleEnd = async () => {
    setPhaseSync('ending')
    clearTimers()
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    window.speechSynthesis?.cancel()
    const el = audioRef.current
    if (el) { el.pause(); el.src = ''; audioRef.current = null }
    stopRecording()
    pcmChunksRef.current = []

    const engineerTurns = conversationRef.current.filter(t => t.speaker === 'engineer')
    if (!engineerTurns.length) {
      setError('Please say at least one thing before ending the session.')
      return
    }
    try {
      const result = await scoreDemoSession(clientId, conversationRef.current)
      setScore(result)
      setPhaseSync('scored')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to score session')
    }
  }

  const restart = () => {
    clearTimers()
    window.speechSynthesis?.cancel()
    audioRef.current?.pause()
    stopRecording()
    pcmChunksRef.current = []
    const initial: ConversationEntry[] = [{ speaker: 'ai', message: OPENING }]
    conversationRef.current = initial
    setConversation(initial)
    setScore(null)
    setError(null)
    setAudioLevel(0)
    setPhaseSync('idle')
  }

  const engineerTurns = conversation.filter(t => t.speaker === 'engineer').length
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timerLabel = `${minutes}:${String(seconds).padStart(2, '0')}`
  const timerUrgent = timeLeft <= 30 && phase === 'listening'

  if (phase === 'scored' && score) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg mx-auto space-y-4"
      >
        <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-400/15 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center">
              <TrendingUp size={32} className="text-emerald-600" />
            </div>
          </div>
          <div>
            <p className="text-5xl font-bold text-foreground tracking-tight">
              {score.communication_score.toFixed(0)}
            </p>
            <p className="text-muted-foreground text-sm mt-1">Practice Score / 100</p>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{score.ai_feedback}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-emerald-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" /> Strengths
            </h3>
            <ul className="space-y-2">
              {score.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-emerald-600 font-bold">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-card border border-amber-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-600" /> Improve
            </h3>
            <ul className="space-y-2">
              {score.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-amber-600 font-bold">→</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={restart}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}
        >
          Practice Again
        </motion.button>
      </motion.div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Practice Pitch: {clientName}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI prospect · {engineerTurns} turn{engineerTurns !== 1 ? 's' : ''} · speak freely
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Practice
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 py-2">
        <AIAvatar phase={phase} audioLevel={audioLevel} />

        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-sm text-muted-foreground">
              Ready to start — click the button below to call the prospect
            </motion.p>
          )}
          {phase === 'ai-speaking' && (
            <motion.p key="as" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-sm font-semibold text-violet-600">
              Prospect is speaking…
            </motion.p>
          )}
          {phase === 'listening' && (
            <motion.div key="l" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-1.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-orange-600">
                <Mic size={14} />
                Your turn — pitch your product
              </p>
              <p className={`text-xs font-mono font-semibold tabular-nums ${timerUrgent ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
                {timerLabel} · silence auto-submits
              </p>
            </motion.div>
          )}
          {phase === 'processing' && (
            <motion.p key="p" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-sm font-medium text-violet-500 tracking-wide">
              <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                Prospect is thinking…
              </motion.span>
            </motion.p>
          )}
          {phase === 'ending' && (
            <motion.p key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Scoring your session…
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className={`bg-card border border-border rounded-2xl overflow-hidden shadow-sm transition-opacity ${phase === 'idle' ? 'opacity-30 pointer-events-none' : ''}`}>
        <div className="h-52 overflow-y-auto px-4 py-4 space-y-2.5">
          {conversation.map((entry, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className={`flex ${entry.speaker === 'engineer' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2 rounded-xl text-sm leading-snug ${
                  entry.speaker === 'ai'
                    ? 'bg-muted text-foreground rounded-bl-sm'
                    : 'bg-primary text-primary-foreground rounded-br-sm'
                }`}
              >
                {entry.speaker === 'ai' && (
                  <span className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-0.5">Prospect</span>
                )}
                {entry.message}
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-2.5"
          >
            <AlertCircle size={13} className="shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'idle' && (
          <motion.button
            key="start-btn"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="w-full py-4 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            <Phone size={16} />
            Start Practice Call
          </motion.button>
        )}
        {engineerTurns >= 1 &&
          (phase === 'listening' || phase === 'processing' || phase === 'ai-speaking') && (
            <motion.button
              key="end-btn"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleEnd}
              className="w-full py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/5 transition-colors"
            >
              End &amp; Score
            </motion.button>
          )}
      </AnimatePresence>
    </div>
  )
}
