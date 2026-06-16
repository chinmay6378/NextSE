'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, ArrowRight, RotateCcw } from 'lucide-react'
import { mcqStore, resultStore } from '@/lib/data-store'
import { scoreTestResponse } from '@/lib/mock-llm'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import type { MCQQuestion } from '@/lib/mock-llm'

interface MCQTestProps {
  clientId: string
  clientName: string
  onComplete: (score: number, total: number) => void
}

export function MCQTest({ clientId, clientName, onComplete }: MCQTestProps) {
  const { user } = useAuth()
  const [questions] = useState<MCQQuestion[]>(mcqStore.getByClientId(clientId))
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [completed, setCompleted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds

  const currentQuestion = questions[currentQuestionIdx]
  const isLastQuestion = currentQuestionIdx === questions.length - 1

  // Timer effect
  React.useEffect(() => {
    if (completed || timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [completed, timeLeft])

  const handleAnswer = (selectedOption: number) => {
    const newAnswers = [...answers]
    newAnswers[currentQuestionIdx] = selectedOption
    setAnswers(newAnswers)

    if (isLastQuestion) {
      handleSubmit(newAnswers)
    } else {
      setCurrentQuestionIdx(prev => prev + 1)
    }
  }

  const handleSubmit = (finalAnswers: number[]) => {
    const result = scoreTestResponse(questions, finalAnswers)
    
    // Save result
    if (user) {
      resultStore.add({
        id: Math.random().toString(36).substring(7),
        userId: user.id,
        clientId: clientId,
        mcqScore: result.score,
        mcqTotal: result.total,
        voiceScore: 0,
        communicationScore: 0,
        overallScore: Math.round((result.score / result.total) * 100),
        timestamp: new Date(),
        details: { answers: finalAnswers, timeUsed: 600 - timeLeft }
      })
    }

    setCompleted(true)
    toast.success('Test submitted successfully!')
    onComplete(result.score, result.total)
  }

  const handleSkip = () => {
    const newAnswers = [...answers]
    newAnswers[currentQuestionIdx] = -1 // Mark as skipped
    setAnswers(newAnswers)

    if (isLastQuestion) {
      handleSubmit(newAnswers)
    } else {
      setCurrentQuestionIdx(prev => prev + 1)
    }
  }

  const handleRestart = () => {
    setCurrentQuestionIdx(0)
    setAnswers([])
    setCompleted(false)
    setTimeLeft(600)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No questions available for this client.</p>
      </div>
    )
  }

  if (completed) {
    const result = scoreTestResponse(questions, answers)
    const percentage = Math.round((result.score / result.total) * 100)
    const passed = percentage >= 70

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto space-y-8"
      >
        {/* Result Card */}
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className={`mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center ${passed ? 'bg-accent/20' : 'bg-destructive/20'}`}
          >
            {passed ? (
              <CheckCircle2 className="text-accent" size={48} />
            ) : (
              <XCircle className="text-destructive" size={48} />
            )}
          </motion.div>

          <h2 className={`text-3xl font-bold mb-2 ${passed ? 'text-accent' : 'text-destructive'}`}>
            {passed ? 'Congratulations!' : 'Keep Practicing'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {passed
              ? 'You passed the MCQ test! Proceed to the voice conversation phase.'
              : 'Review the materials and try again to improve your score.'}
          </p>

          {/* Score Display */}
          <div className="bg-muted/50 rounded-lg p-6 mb-8">
            <div className="text-5xl font-bold text-primary mb-2">{percentage}%</div>
            <div className="text-muted-foreground">
              {result.score} out of {result.total} questions correct
            </div>
          </div>

          {/* Answer Review */}
          <div className="bg-background border border-border rounded-lg p-6 text-left mb-8 max-h-96 overflow-auto">
            <h3 className="font-bold text-foreground mb-4">Answer Review</h3>
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const isCorrect = answers[idx] === q.correctAnswer
                const skipped = answers[idx] === -1
                return (
                  <div key={q.id} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-foreground flex-1">Q{idx + 1}: {q.question}</span>
                      {skipped ? (
                        <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">Skipped</span>
                      ) : isCorrect ? (
                        <CheckCircle2 className="text-accent flex-shrink-0" size={20} />
                      ) : (
                        <XCircle className="text-destructive flex-shrink-0" size={20} />
                      )}
                    </div>
                    {!skipped && !isCorrect && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Correct answer:</span> {q.options[q.correctAnswer]}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleRestart}
              className="flex-1 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Retake Test
            </button>
            {passed && (
              <button
                onClick={() => onComplete(result.score, result.total)}
                className="flex-1 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium flex items-center justify-center gap-2"
              >
                Proceed to Voice Test
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  const progress = ((currentQuestionIdx + 1) / questions.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">MCQ Test: {clientName}</h1>
            <p className="text-muted-foreground mt-1">Test your product knowledge</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg">
            <Clock size={18} className="text-primary" />
            <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestionIdx + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-8 space-y-6"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">{currentQuestion.question}</h2>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = answers[currentQuestionIdx] === idx
            const isCorrect = idx === currentQuestion.correctAnswer

            return (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(idx)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 bg-background'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-primary bg-primary' : 'border-border'
                  }`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="font-medium text-foreground">{option}</span>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Explanation (shown when answered) */}
        {answers[currentQuestionIdx] !== undefined && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-muted/50 border border-muted rounded-lg p-4"
          >
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">Explanation:</span> {currentQuestion.explanation}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleSkip}
          className="flex-1 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
        >
          Skip
        </button>
        {isLastQuestion && answers[currentQuestionIdx] !== undefined && (
          <button
            onClick={() => handleSubmit(answers)}
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
          >
            Submit Test
            <ArrowRight size={18} />
          </button>
        )}
        {!isLastQuestion && answers[currentQuestionIdx] !== undefined && (
          <button
            onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
          >
            Next Question
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
