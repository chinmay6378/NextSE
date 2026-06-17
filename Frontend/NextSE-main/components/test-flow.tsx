'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  XCircle,
} from 'lucide-react'

import { listEngineerTestRequests, startTest, submitMCQ } from '@/lib/api/tests'
import type { MCQQuestion, MCQResult, TestRequest } from '@/lib/api/types'

type Stage = 'list' | 'mcq' | 'result'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Approval',
  approved: 'Ready to Start',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  approved: 'bg-primary/15 text-primary',
  in_progress: 'bg-sky-500/15 text-sky-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function TestFlow() {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<Stage>('list')
  const [activeRequest, setActiveRequest] = useState<TestRequest | null>(null)
  const [questions, setQuestions] = useState<MCQQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<MCQResult | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  const { data: testRequests, isLoading } = useQuery({
    queryKey: ['test-requests'],
    queryFn: listEngineerTestRequests,
  })

  const startMutation = useMutation({
    mutationFn: (requestId: string) => startTest(requestId),
    onSuccess: (data) => {
      setQuestions(data.questions)
      setAnswers({})
      setCurrentQ(0)
      setStartError(null)
    },
    onError: (err) => {
      setStartError(err instanceof Error ? err.message : 'Failed to load questions')
      setStage('list')
    },
  })

  const submitMutation = useMutation({
    mutationFn: (answersList: { question_id: string; selected_option_index: number }[]) =>
      submitMCQ(activeRequest!.id, answersList),
    onSuccess: (data) => {
      setResult(data)
      setStage('result')
      queryClient.invalidateQueries({ queryKey: ['test-requests'] })
    },
  })

  const handleStart = (request: TestRequest) => {
    setActiveRequest(request)
    setStartError(null)
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
    const answersList = Object.entries(answers).map(([question_id, selected_option_index]) => ({
      question_id,
      selected_option_index,
    }))
    submitMutation.mutate(answersList)
  }

  const handleDone = () => {
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
      <AnimatePresence mode="wait">
        {/* ── LIST ── */}
        {stage === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-3xl font-bold">Test Flow</h1>
              <p className="text-muted-foreground mt-2">
                Complete your assigned client assessments
              </p>
            </div>

            {startError && (
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                {startError}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-muted-foreground" size={32} />
              </div>
            )}

            {!isLoading && !testRequests?.length && (
              <div className="text-center py-16 bg-card border border-border rounded-xl">
                <ClipboardList className="mx-auto mb-3 text-muted-foreground" size={40} />
                <p className="font-semibold text-foreground mb-2">No Tests Assigned</p>
                <p className="text-muted-foreground text-sm">
                  An admin will assign a client test when you&apos;re ready.
                </p>
              </div>
            )}

            {testRequests && testRequests.length > 0 && (
              <div className="space-y-3">
                {testRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-6 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">
                          {req.client_name ?? 'Unknown Client'}
                        </h3>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Assigned {new Date(req.requested_at).toLocaleDateString()}
                      </p>
                    </div>

                    {(req.status === 'approved' || req.status === 'in_progress') && (
                      <button
                        onClick={() => handleStart(req)}
                        className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        {req.status === 'in_progress' ? 'Resume' : 'Start Test'}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── MCQ ── */}
        {stage === 'mcq' && (
          <motion.div
            key="mcq"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* loading while generating questions */}
            {startMutation.isPending && (
              <div className="text-center py-24 space-y-4">
                <Loader2 className="animate-spin mx-auto text-primary" size={40} />
                <p className="text-muted-foreground">Generating questions for {activeRequest?.client_name}…</p>
                <p className="text-xs text-muted-foreground">This may take a few seconds</p>
              </div>
            )}

            {/* questions ready */}
            {!startMutation.isPending && questions.length > 0 && (
              <>
                {/* header + progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">MCQ Assessment</h2>
                      <p className="text-sm text-muted-foreground">{activeRequest?.client_name}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {currentQ + 1} / {questions.length}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>

                {/* question card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`q-${currentQ}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    className="bg-card border border-border rounded-xl p-8 space-y-6"
                  >
                    {questions[currentQ].difficulty && (
                      <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded">
                        {questions[currentQ].difficulty}
                      </span>
                    )}
                    <h3 className="text-xl font-semibold text-foreground leading-snug">
                      {questions[currentQ].question_text}
                    </h3>
                    <div className="space-y-3">
                      {questions[currentQ].options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(idx)}
                          className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                            currentAnswer === idx
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border hover:border-primary/50 text-foreground'
                          }`}
                        >
                          <span className="font-medium mr-2 text-muted-foreground">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          {option}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* navigation */}
                {isLastQuestion ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitMutation.isPending}
                    className="w-full py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {submitMutation.isPending ? (
                      <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                    ) : (
                      'Submit Answers'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={currentAnswer === undefined}
                    className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next Question
                  </button>
                )}

                <button
                  onClick={handleDone}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Save and return later
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* ── RESULT ── */}
        {stage === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* score hero */}
            <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 ${
                  result.passed
                    ? 'bg-emerald-500/15 border-emerald-500'
                    : 'bg-destructive/15 border-destructive'
                }`}
              >
                {result.passed ? (
                  <CheckCircle2 size={40} className="text-emerald-400" />
                ) : (
                  <XCircle size={40} className="text-destructive" />
                )}
              </div>
              <div>
                <p className="text-5xl font-bold text-foreground">{result.score_percent}%</p>
                <p className="text-muted-foreground mt-1">
                  {result.correct} / {result.total} correct
                </p>
              </div>
              <div
                className={`inline-block text-sm font-semibold px-4 py-1.5 rounded-full ${
                  result.passed
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-destructive/15 text-destructive'
                }`}
              >
                {result.passed ? 'Passed (≥70%)' : 'Did not pass (<70%)'}
              </div>
              {!result.passed && (
                <p className="text-sm text-muted-foreground">
                  Review the study materials and ask your admin to assign a new test.
                </p>
              )}
            </div>

            {/* question breakdown */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold">Answer Breakdown</h3>
              </div>
              <div className="divide-y divide-border">
                {result.question_results.map((qr, idx) => {
                  const q = questions.find((q) => q.id === qr.question_id)
                  return (
                    <div key={qr.question_id} className="p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        {qr.is_correct ? (
                          <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={18} className="text-destructive shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            Q{idx + 1}. {q?.question_text ?? `Question ${idx + 1}`}
                          </p>
                          {!qr.is_correct && q && (
                            <>
                              <p className="text-xs text-destructive">
                                Your answer: {qr.selected_option_index >= 0
                                  ? q.options[qr.selected_option_index]
                                  : 'Not answered'}
                              </p>
                              <p className="text-xs text-emerald-400">
                                Correct: {q.options[qr.correct_option_index]}
                              </p>
                            </>
                          )}
                          {qr.explanation && (
                            <p className="text-xs text-muted-foreground italic">{qr.explanation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleDone}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Back to Tests
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
