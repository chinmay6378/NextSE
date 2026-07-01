'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  Mic,
  TrendingUp,
} from 'lucide-react'

import { endVoiceSession, startVoiceSession, submitVoiceTurn } from '@/lib/api/voice'
import type { VoiceScoreOut, VoiceTranscriptEntry } from '@/lib/api/types'

const TURN_SECONDS = 120
const MAX_TURNS = 12
const SILENCE_THRESHOLD = 0.025
const SILENCE_GRACE_MS = 2000
const MIN_RECORDING_MS = 800        // was 3000
const INTERRUPT_THRESHOLD = 0.04
const INTERRUPT_DURATION_MS = 180   // sustained speech ms before barge-in

interface Props {
  testRequestId: string
  clientName: string
  onDone: () => void
}

type Phase = 'starting' | 'ai-speaking' | 'listening' | 'processing' | 'ending' | 'scored'

function encodeWAV(chunks: Float32Array[], sampleRate: number): Blob {
  const totalSamples = chunks.reduce((n, c) => n + c.length, 0)
  const buf = new ArrayBuffer(44 + totalSamples * 2)
  const v = new DataView(buf)
  const w = (o: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))

  w(0, 'RIFF'); v.setUint32(4, 36 + totalSamples * 2, true)
  w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  w(36, 'data'); v.setUint32(40, totalSamples * 2, true)

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

// ─── AI Avatar ────────────────────────────────────────────────────────────────

function AIAvatar({ phase, audioLevel }: { phase: Phase; audioLevel: number }) {
  const isSpeaking = phase === 'ai-speaking'
  const isListening = phase === 'listening'
  const isProcessing = phase === 'processing'

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
        <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
          <Loader2 size={16} className="text-muted-foreground animate-spin" />
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VoiceAssessment({ testRequestId, clientName, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('starting')
  const [transcript, setTranscript] = useState<VoiceTranscriptEntry[]>([])
  const [turnCount, setTurnCount] = useState(0)
  const [score, setScore] = useState<VoiceScoreOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS)
  const [audioLevel, setAudioLevel] = useState(0)

  const sessionIdRef = useRef<string | null>(null)
  const phaseRef = useRef<Phase>('starting')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Persistent mic infrastructure — created once per session, not per turn
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sampleRateRef = useRef<number>(48000)

  const pcmChunksRef = useRef<Float32Array[]>([])
  const recordingStartRef = useRef<number>(0)
  const submittingRef = useRef(false)

  // Interrupt detection
  const interruptRafRef = useRef<number | null>(null)
  const interruptLoudSinceRef = useRef<number | null>(null)

  const startListeningRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const stopAndSendRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const handleEndRef = useRef<() => Promise<void>>(() => Promise.resolve())

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
    analyserRef.current = null
  }, [])

  const stopInterruptDetection = useCallback(() => {
    if (interruptRafRef.current !== null) {
      cancelAnimationFrame(interruptRafRef.current)
      interruptRafRef.current = null
    }
    interruptLoudSinceRef.current = null
  }, [])

  const startInterruptDetection = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    stopInterruptDetection()

    const data = new Uint8Array(analyser.frequencyBinCount)

    const detect = () => {
      if (phaseRef.current !== 'ai-speaking') return

      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)

      if (rms > INTERRUPT_THRESHOLD) {
        if (!interruptLoudSinceRef.current) {
          interruptLoudSinceRef.current = Date.now()
        } else if (Date.now() - interruptLoudSinceRef.current > INTERRUPT_DURATION_MS) {
          stopInterruptDetection()
          audioRef.current?.pause()
          submittingRef.current = false
          setPhaseSync('listening')
          void startListeningRef.current()
          return
        }
      } else {
        interruptLoudSinceRef.current = null
      }

      interruptRafRef.current = requestAnimationFrame(detect)
    }

    interruptRafRef.current = requestAnimationFrame(detect)
  }, [stopInterruptDetection, setPhaseSync])

  const playAudio = useCallback((b64: string): Promise<void> =>
    new Promise((resolve) => {
      const el = new Audio(`data:audio/mp3;base64,${b64}`)
      audioRef.current = el
      el.onended = () => resolve()
      el.onerror = () => resolve()
      el.onpause = () => {
        if (phaseRef.current === 'ending' || phaseRef.current === 'scored') resolve()
      }
      el.play().catch(() => resolve())
    }), [])

  const stopAndSend = useCallback(async () => {
    if (!sessionIdRef.current) return
    if (submittingRef.current) return
    submittingRef.current = true
    clearTimers()
    setPhaseSync('processing')
    setAudioLevel(0)

    // Do NOT stop the mic — keep AudioContext alive for the next turn

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
      const result = await submitVoiceTurn(sessionIdRef.current!, blob)
      setTranscript(result.session_transcript)
      setTurnCount(result.turn_count)
      setError(null)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)

      if (result.ai_audio_b64 && phaseRef.current !== 'ending' && phaseRef.current !== 'scored') {
        setPhaseSync('ai-speaking')
        // Brief drain to avoid AI audio triggering interrupt on its own echo
        await new Promise(r => setTimeout(r, 80))
        startInterruptDetection()
        await playAudio(result.ai_audio_b64)
        stopInterruptDetection()
      }

      submittingRef.current = false
      if (result.turn_count >= MAX_TURNS && phaseRef.current !== 'ending' && phaseRef.current !== 'scored') {
        await handleEndRef.current()
        return
      }
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
  }, [clearTimers, setPhaseSync, playAudio, startInterruptDetection, stopInterruptDetection])

  const startListening = useCallback(async () => {
    if (phaseRef.current === 'ending' || phaseRef.current === 'scored') return
    setError(null)

    // Create mic infrastructure only once per session
    if (!streamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        })
        streamRef.current = stream

        const ctx = new AudioContext()
        audioCtxRef.current = ctx
        sampleRateRef.current = ctx.sampleRate
        const source = ctx.createMediaStreamSource(stream)

        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser

        const processor = ctx.createScriptProcessor(4096, 1, 1)
        processorRef.current = processor
        processor.onaudioprocess = (e) => {
          if (phaseRef.current === 'listening') {
            pcmChunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)))
          }
        }
        // Silent gain node — processor must be connected to destination to fire
        const silentGain = ctx.createGain()
        silentGain.gain.value = 0
        source.connect(processor)
        processor.connect(silentGain)
        silentGain.connect(ctx.destination)
      } catch {
        setError('Microphone access denied — please allow microphone and refresh.')
        return
      }
    }

    // Brief drain to discard room echo from AI audio
    await new Promise(r => setTimeout(r, 80))
    if (phaseRef.current === 'ending' || phaseRef.current === 'scored') return

    pcmChunksRef.current = []
    recordingStartRef.current = Date.now()
    setPhaseSync('listening')

    const analyser = analyserRef.current!
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
          void stopAndSendRef.current()
          return
        }
      }
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)

    setTimeLeft(TURN_SECONDS)
    let remaining = TURN_SECONDS
    timerRef.current = setInterval(() => {
      remaining -= 1
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        void stopAndSendRef.current()
      }
    }, 1000)
  }, [setPhaseSync])

  useEffect(() => { stopAndSendRef.current = stopAndSend }, [stopAndSend])
  useEffect(() => { startListeningRef.current = startListening }, [startListening])
  useEffect(() => { handleEndRef.current = handleEnd })

  useEffect(() => {
    startVoiceSession(testRequestId)
      .then(async (data) => {
        sessionIdRef.current = data.id
        setTranscript([
          {
            id: 'opening',
            speaker: 'ai',
            message: data.opening_message,
            timestamp_ms: 0,
            sequence_index: 0,
          },
        ])
        if (data.opening_audio_b64) {
          setPhaseSync('ai-speaking')
          await playAudio(data.opening_audio_b64)
        }
        await startListeningRef.current()
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to start voice session')
        setPhaseSync('listening')
      })

    return () => {
      phaseRef.current = 'ending'
      submittingRef.current = false
      clearTimers()
      if (interruptRafRef.current !== null) cancelAnimationFrame(interruptRafRef.current)
      audioRef.current?.pause()
      processorRef.current?.disconnect()
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEnd = async () => {
    setPhaseSync('ending')
    clearTimers()
    stopInterruptDetection()
    audioRef.current?.pause()
    stopRecording()
    pcmChunksRef.current = []

    if (!sessionIdRef.current) return
    setError(null)
    try {
      const result = await endVoiceSession(sessionIdRef.current)
      setScore(result)
      setPhaseSync('scored')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to score session')
    }
  }

  if (phase === 'scored' && score) {
    return <ScoreScreen score={score} onDone={onDone} />
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timerLabel = `${minutes}:${String(seconds).padStart(2, '0')}`
  const timerUrgent = timeLeft <= 30 && phase === 'listening'

  return (
    <div className="max-w-lg mx-auto space-y-6 py-2">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Voice Assessment</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pitch to the AI prospect for <span className="font-medium">{clientName}</span>
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 py-2">
        <AIAvatar phase={phase} audioLevel={audioLevel} />

        <AnimatePresence mode="wait">
          {phase === 'starting' && (
            <motion.p key="starting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Connecting to AI prospect…
            </motion.p>
          )}
          {phase === 'ai-speaking' && (
            <motion.div key="ai-speaking" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-1">
              <p className="text-sm font-semibold text-violet-600">Prospect is speaking…</p>
              <p className="text-[11px] text-muted-foreground/50">speak to interrupt</p>
            </motion.div>
          )}
          {phase === 'listening' && (
            <motion.div key="listening" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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
            <motion.div key="processing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2">
              <motion.span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} />
              <motion.span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
              <motion.span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
            </motion.div>
          )}
          {phase === 'ending' && (
            <motion.p key="ending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Scoring your session…
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="h-52 overflow-y-auto px-4 py-4 space-y-2.5">
          <AnimatePresence initial={false}>
            {transcript.map((entry) => (
              <motion.div
                key={entry.id + entry.sequence_index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className={`flex ${entry.speaker === 'engineer' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2 rounded-xl text-sm leading-snug ${
                    entry.speaker === 'engineer'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {entry.speaker === 'ai' && (
                    <span className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-0.5">
                      Prospect
                    </span>
                  )}
                  {entry.message}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {transcript.length === 0 && phase === 'starting' && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-muted-foreground" size={22} />
            </div>
          )}
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
        {turnCount >= 1 &&
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
              End Session &amp; Score
            </motion.button>
          )}
      </AnimatePresence>
    </div>
  )
}

// ─── Score screen ─────────────────────────────────────────────────────────────

function ScoreScreen({ score, onDone }: { score: VoiceScoreOut; onDone: () => void }) {
  const commColor =
    score.communication_score >= 75
      ? 'text-emerald-600'
      : score.communication_score >= 50
      ? 'text-amber-600'
      : 'text-red-500'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl mx-auto space-y-5"
    >
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5"
      >
        <CheckCircle2 size={15} className="text-emerald-600" />
        Both stages complete — assessment finished!
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <TrendingUp size={28} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Communication Score
          </p>
          <motion.p
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`text-6xl font-bold tracking-tight ${commColor}`}
          >
            {Math.round(score.communication_score)}%
          </motion.p>
        </div>
        {score.overall_score > 0 && (
          <div className="text-sm text-muted-foreground">
            Overall score (MCQ + Voice):{' '}
            <span className="font-bold text-foreground">{Math.round(score.overall_score)}%</span>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-card border border-border rounded-2xl p-6 shadow-sm"
      >
        <h3 className="font-semibold text-foreground mb-3">AI Feedback</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{score.ai_feedback}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {score.strengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-card border border-emerald-200 rounded-2xl p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2 mb-3">
              <CheckCircle2 size={15} className="text-emerald-600" />
              Strengths
            </h3>
            <ul className="space-y-2">
              {score.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600 text-[10px] font-bold">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
        {score.improvements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-amber-200 rounded-2xl p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-amber-700 mb-3">Areas to Improve</h3>
            <ul className="space-y-2">
              {score.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5 text-amber-600 text-[10px] font-bold">→</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onDone}
        className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all"
        style={{ background: 'linear-gradient(135deg, oklch(0.618 0.195 38), oklch(0.540 0.210 15))' }}
      >
        Finish &amp; Return to Dashboard
      </motion.button>
    </motion.div>
  )
}
