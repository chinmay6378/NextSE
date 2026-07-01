'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Lock,
  Shield,
  XCircle,
} from 'lucide-react'

import { listEngineerTestRequests, startTest, submitMCQ } from '@/lib/api/tests'
import type { MCQQuestion, MCQResult, TestRequest } from '@/lib/api/types'
import { VoiceAssessment } from '@/components/voice-assessment'

type Stage = 'list' | 'mcq' | 'result' | 'voice'

const MAX_VIOLATIONS = 3

const STATUS_LABELS: Record<string, string> = {
  pending:     'Pending Approval',
  approved:    'Ready to Start',
  in_progress: 'In Progress',
  completed:   'Completed',
}

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-amber-50 text-amber-700 border-amber-200',
  approved:    'bg-primary/8 text-primary border-primary/20',
  in_progress: 'bg-sky-50 text-sky-700 border-sky-200',
  completed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border-border'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

const EXAM_RULES = [
  'Do not switch tabs or windows',
  'Do not exit fullscreen (Esc / F11 blocked)',
  'Do not right-click or use Ctrl+C',
  '3 violations = auto-submit',
  'Only the "End Session" button exits the exam',
]

export function TestFlow() {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<Stage>('list')
  const [activeRequest, setActiveRequest] = useState<TestRequest | null>(null)
  const [questions, setQuestions] = useState<MCQQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<MCQResult | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [currentLevel, setCurrentLevel] = useState<number>(1)
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState<number | null>(null)

  // Proctoring state
  const [examStarted, setExamStarted] = useState(false)
  const [violations, setViolations] = useState(0)
  const [proctorWarning, setProctorWarning] = useState<string | null>(null)
  const [autoSubmitting, setAutoSubmitting] = useState(false)

  // Always-current ref so event handlers inside effects never go stale
  const answersRef = useRef(answers)
  answersRef.current = answers
  const activeRequestRef = useRef(activeRequest)
  activeRequestRef.current = activeRequest

  const { data: testRequests, isLoading } = useQuery({
    queryKey: ['test-requests'],
    queryFn: listEngineerTestRequests,
  })

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen().catch(() => {})
  }, [])

  const leaveFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }, [])

  const submitMutation = useMutation({
    mutationFn: (answersList: { question_id: string; selected_option_index: number }[]) =>
      submitMCQ(activeRequestRef.current!.id, answersList),
    onSuccess: (data) => {
      leaveFullscreen()
      setExamStarted(false)
      setViolations(0)
      setProctorWarning(null)
      setAutoSubmitting(false)
      setResult(data)
      setStage('result')
      queryClient.invalidateQueries({ queryKey: ['test-requests'] })
    },
  })

  const startMutation = useMutation({
    mutationFn: (requestId: string) => startTest(requestId),
    onSuccess: (data) => {
      setQuestions(data.questions)
      setCurrentLevel(data.level)
      setAnswers({})
      setCurrentQ(0)
      setStartError(null)
    },
    onError: (err) => {
      setStartError(err instanceof Error ? err.message : 'Failed to load questions')
      setStage('list')
    },
  })

  // Trigger submit (always uses latest answers via ref)
  const doSubmit = useCallback(() => {
    const answersList = Object.entries(answersRef.current).map(
      ([question_id, selected_option_index]) => ({ question_id, selected_option_index })
    )
    submitMutation.mutate(answersList)
  }, [submitMutation])

  // Register proctoring event listeners once exam begins
  useEffect(() => {
    if (!examStarted || stage !== 'mcq') return

    const addViolation = (reason: string) => {
      setViolations((prev) => {
        const next = prev + 1
        if (next >= MAX_VIOLATIONS) {
          setAutoSubmitting(true)
          setProctorWarning(`3 violations reached — auto-submitting your exam.`)
        } else {
          setProctorWarning(reason)
        }
        return next
      })
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        addViolation('Tab switch or window switch detected.')
      }
    }

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        addViolation('Fullscreen exited — click "Return to Exam" to continue.')
      }
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    const onKeyDown = (e: KeyboardEvent) => {
      // Block Escape at capture phase (fires before browser fullscreen handler on some browsers)
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        return
      }
      if (e.key === 'F11') {
        e.preventDefault()
        return
      }
      // Block Ctrl/Cmd combos (copy, paste, select-all, print, etc.)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('keydown', onKeyDown, { capture: true })

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [examStarted, stage])

  // Auto-submit when violations hit max
  useEffect(() => {
    if (autoSubmitting && !submitMutation.isPending) {
      const t = setTimeout(() => doSubmit(), 1800)
      return () => clearTimeout(t)
    }
  }, [autoSubmitting, submitMutation.isPending, doSubmit])

  // Auto-redirect to AI Pitch Test after MCQ pass
  useEffect(() => {
    if (stage !== 'result' || !result?.passed) return
    setAutoRedirectCountdown(5)
    const interval = setInterval(() => {
      setAutoRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          setStage('voice')
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [stage, result?.passed])

  const handleStart = (request: TestRequest) => {
    setActiveRequest(request)
    setStartError(null)
    setExamStarted(false)
    setViolations(0)
    setProctorWarning(null)
    setAutoSubmitting(false)
    setStage('mcq')
    startMutation.mutate(request.id)
  }

  const handleAnswer = (optionIdx: number) => {
    const qId = questions[currentQ]?.id
    if (!qId) return
    setAnswers((prev) => ({ ...prev, [qId]: optionIdx }))
  }

  const handleNext = () => {
    if (currentQ < questions.length - 1) setCurrentQ((q) => q + 1)
  }

  const handleSubmit = () => {
    leaveFullscreen()
    setExamStarted(false)
    doSubmit()
  }

  const handleDone = () => {
    leaveFullscreen()
    setExamStarted(false)
    setViolations(0)
    setProctorWarning(null)
    setAutoSubmitting(false)
    setStage('list')
    setActiveRequest(null)
    setResult(null)
    setQuestions([])
    setAnswers({})
    setCurrentQ(0)
  }

  const currentAnswer = questions[currentQ] ? answers[questions[currentQ].id] : undefined
  const isLastQuestion = currentQ === questions.length - 1
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined)

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── PROCTORING VIOLATION OVERLAY ── */}
      <AnimatePresence>
        {proctorWarning && stage === 'mcq' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              className="bg-white rounded-2xl border-2 border-red-400 shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Red header */}
              <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <AlertCircle size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">
                    {autoSubmitting ? 'Exam Auto-Submitted' : 'Violation Detected'}
                  </p>
                  <p className="text-red-100 text-xs mt-0.5">Secure Exam Proctoring</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Violation message */}
                <p className="text-gray-800 font-semibold text-sm text-center">{proctorWarning}</p>

                {/* Violation counter dots */}
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs text-gray-500 font-medium">Violations:</span>
                  {Array.from({ length: MAX_VIOLATIONS }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        i < violations
                          ? 'bg-red-500 border-red-500 text-white scale-110'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Rules reminder */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Exam Rules</p>
                  <ul className="space-y-1.5">
                    {EXAM_RULES.map((rule, i) => (
                      <li key={i} className="text-xs text-red-800 flex items-start gap-2">
                        <span className="text-red-400 shrink-0 mt-0.5">•</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action */}
                {autoSubmitting ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-600 font-medium">
                    <Loader2 size={16} className="animate-spin text-red-500" />
                    Submitting your answers…
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setProctorWarning(null)
                      enterFullscreen()
                    }}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Lock size={14} />
                    Return to Exam (Re-enter Fullscreen)
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ── LIST ── */}
        {stage === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground">Assessments</h1>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Complete your assigned client assessments
              </p>
            </div>

            {startError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-destructive/8 border border-destructive/25 rounded-xl p-4 text-destructive text-sm"
              >
                <AlertCircle size={17} className="shrink-0 mt-0.5" />
                {startError}
              </motion.div>
            )}

            {isLoading && (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-muted-foreground" size={28} />
              </div>
            )}

            {!isLoading && !testRequests?.length && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-card border border-border rounded-2xl"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="text-muted-foreground" size={24} />
                </div>
                <p className="font-semibold text-foreground mb-1.5">No Tests Assigned</p>
                <p className="text-muted-foreground text-sm">
                  An admin will assign a client test when you&apos;re ready.
                </p>
              </motion.div>
            )}

            {testRequests && testRequests.length > 0 && (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {testRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    variants={itemAnim}
                    whileHover={{ y: -2, transition: { duration: 0.18 } }}
                    className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-foreground">
                          {req.client_name ?? 'Unknown Client'}
                        </h3>
                        <StatusBadge status={req.status} />
                        {req.score_percent != null && (
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                              req.passed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-600 border-red-200'
                            }`}
                          >
                            {req.score_percent.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Assigned {new Date(req.requested_at).toLocaleDateString()}
                      </p>
                    </div>

                    {(req.status === 'approved' || req.status === 'in_progress') && (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleStart(req)}
                        className="shrink-0 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                        style={{ boxShadow: '0 4px 18px oklch(0.618 0.195 38 / 0.24)' }}
                      >
                        {req.status === 'in_progress' ? 'Resume' : 'Start Test'}
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── MCQ ── */}
        {stage === 'mcq' && (
          <motion.div
            key="mcq"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Loading questions */}
            {startMutation.isPending && (
              <div className="text-center py-24 space-y-5">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="mx-auto text-primary" size={36} />
                </motion.div>
                <div>
                  <p className="text-foreground font-semibold">Generating questions…</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Building L{currentLevel} MCQ for {activeRequest?.client_name}
                  </p>
                </div>
              </div>
            )}

            {/* ── EXAM RULES / FULLSCREEN GATE ── */}
            {!startMutation.isPending && questions.length > 0 && !examStarted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-7 py-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Shield size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Secure Exam Environment</p>
                    <p className="text-gray-400 text-sm mt-0.5">{activeRequest?.client_name} · L{currentLevel} MCQ Assessment</p>
                  </div>
                </div>

                <div className="p-7 space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Before you begin, read these rules carefully:
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Violations are tracked automatically. Your exam will auto-submit at 3 violations.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {EXAM_RULES.map((rule, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                          i === 3
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : i === 4
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-muted/50 border-border text-foreground'
                        }`}
                      >
                        <span className={`text-base ${i === 3 ? 'text-red-500' : i === 4 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {i === 4 ? '✅' : '⚠️'}
                        </span>
                        <span className="text-sm font-medium">{rule}</span>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      enterFullscreen()
                      setExamStarted(true)
                    }}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}
                  >
                    <Lock size={15} />
                    Enter Fullscreen &amp; Begin Exam
                  </motion.button>

                  <button
                    onClick={handleDone}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Cancel and go back
                  </button>
                </div>
              </motion.div>
            )}

            {/* Questions ready */}
            {!startMutation.isPending && questions.length > 0 && examStarted && (
              <>
                {/* Header + progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">L{currentLevel} MCQ Assessment</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">{activeRequest?.client_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Violation indicators */}
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: MAX_VIOLATIONS }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${
                              i < violations ? 'bg-red-500' : 'bg-gray-200'
                            }`}
                            title={`Violation ${i + 1}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {currentQ + 1}
                        <span className="text-muted-foreground/50"> / {questions.length}</span>
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, oklch(0.618 0.195 38), oklch(0.540 0.210 15))' }}
                      animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>

                {/* Question card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`q-${currentQ}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-card border border-border rounded-2xl p-7 shadow-sm space-y-6"
                  >
                    {questions[currentQ].difficulty && (
                      <span className="text-[11px] font-semibold text-muted-foreground capitalize bg-muted px-2.5 py-1 rounded-full">
                        {questions[currentQ].difficulty}
                      </span>
                    )}
                    <h3 className="text-[18px] font-semibold text-foreground leading-snug">
                      {questions[currentQ].question_text}
                    </h3>
                    <div className="space-y-2.5">
                      {questions[currentQ].options.map((option, idx) => (
                        <motion.button
                          key={idx}
                          onClick={() => handleAnswer(idx)}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.99 }}
                          className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-200 text-sm ${
                            currentAnswer === idx
                              ? 'border-primary bg-primary/8 text-foreground'
                              : 'border-border hover:border-primary/40 text-foreground hover:bg-muted/40'
                          }`}
                        >
                          <span className="font-bold mr-2.5 text-muted-foreground">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          {option}
                          {currentAnswer === idx && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="ml-2 inline-block"
                            >
                              <CheckCircle2 size={14} className="inline text-primary" />
                            </motion.span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                {isLastQuestion ? (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitMutation.isPending}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white"
                    style={{ background: 'linear-gradient(135deg, oklch(0.700 0.172 142), oklch(0.620 0.180 160))' }}
                  >
                    {submitMutation.isPending ? (
                      <><Loader2 size={16} className="inline animate-spin mr-2" />Submitting…</>
                    ) : (
                      'Submit Answers'
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNext}
                    disabled={currentAnswer === undefined}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white"
                    style={{ background: 'linear-gradient(135deg, oklch(0.618 0.195 38), oklch(0.540 0.210 15))' }}
                  >
                    Next Question →
                  </motion.button>
                )}

                <button
                  onClick={handleDone}
                  className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors font-medium"
                >
                  End Session
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* ── RESULT ── */}
        {stage === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            {/* Score hero */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm space-y-4"
            >
              <div className="relative w-20 h-20 mx-auto">
                {result.passed && (
                  <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                )}
                <div
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center border-2 ${
                    result.passed
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-red-50 border-red-300'
                  }`}
                >
                  {result.passed ? (
                    <CheckCircle2 size={36} className="text-emerald-600" />
                  ) : (
                    <XCircle size={36} className="text-red-500" />
                  )}
                </div>
              </div>

              <div>
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-5xl font-bold text-foreground tracking-tight"
                >
                  {result.score_percent}%
                </motion.p>
                <p className="text-muted-foreground mt-1">
                  {result.correct} / {result.total} correct
                </p>
              </div>

              <div
                className={`inline-block text-sm font-semibold px-4 py-1.5 rounded-full ${
                  result.passed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}
              >
                {result.passed ? `✓ L${result.level} Passed (≥70%)` : `✗ L${result.level} Failed (<70%)`}
              </div>

              {result.passed && (
                <p className="text-sm text-muted-foreground">
                  Stage 1 complete! Proceed to the AI Pitch Test to finish your evaluation.
                </p>
              )}
              {!result.passed && (
                <p className="text-sm text-muted-foreground">
                  Review the study materials and ask your admin to assign a new test.
                </p>
              )}
            </motion.div>

            {/* Question breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Answer Breakdown</h3>
              </div>
              <div className="divide-y divide-border">
                {result.question_results.map((qr, idx) => {
                  const q = questions.find((q) => q.id === qr.question_id)
                  return (
                    <motion.div
                      key={qr.question_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + idx * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="p-4 space-y-2"
                    >
                      <div className="flex items-start gap-3">
                        {qr.is_correct ? (
                          <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={17} className="text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            Q{idx + 1}. {q?.question_text ?? `Question ${idx + 1}`}
                          </p>
                          {!qr.is_correct && q && (
                            <>
                              <p className="text-xs text-red-500">
                                Your answer:{' '}
                                {qr.selected_option_index >= 0
                                  ? q.options[qr.selected_option_index]
                                  : 'Not answered'}
                              </p>
                              <p className="text-xs text-emerald-600">
                                Correct: {q.options[qr.correct_option_index]}
                              </p>
                            </>
                          )}
                          {qr.explanation && (
                            <p className="text-xs text-muted-foreground italic">{qr.explanation}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            <div className="flex flex-col gap-3">
              {result.passed ? (
                <>
                  {/* Stage 2 prompt */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3"
                  >
                    <span className="text-lg">🎤</span>
                    <div>
                      <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">Stage 2 of 2</p>
                      <p className="text-sm text-violet-800 font-medium">AI Pitch Test — speak your product pitch to the AI prospect</p>
                    </div>
                  </motion.div>
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setAutoRedirectCountdown(null); setStage('voice') }}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                  >
                    {autoRedirectCountdown !== null
                      ? `Starting AI Pitch Test in ${autoRedirectCountdown}s…`
                      : 'Start AI Pitch Test →'}
                  </motion.button>
                </>
              ) : (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDone}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm border border-border bg-card hover:bg-muted transition-colors"
                >
                  Back to Tests
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── VOICE ── */}
        {stage === 'voice' && activeRequest && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <VoiceAssessment
              testRequestId={activeRequest.id}
              clientName={activeRequest.client_name ?? 'Client'}
              onDone={handleDone}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
