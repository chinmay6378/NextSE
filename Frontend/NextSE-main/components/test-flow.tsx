'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Mic, RotateCcw, Volume2 } from 'lucide-react'

type Stage = 'select' | 'mcq' | 'voice'

interface Test {
  id: string
  name: string
  duration: string
  questions: number
}

const tests: Test[] = [
  { id: 'objection', name: 'Objection Handling', duration: '15 min', questions: 10 },
  { id: 'discovery', name: 'Discovery Questions', duration: '12 min', questions: 8 },
  { id: 'closing', name: 'Closing Techniques', duration: '18 min', questions: 12 },
]

const mcqQuestions = [
  {
    id: 'q1',
    question: 'When a customer says "It&apos;s too expensive", what should you do first?',
    options: ['Lower the price immediately', 'Ask about their budget concerns', 'Show competitor pricing', 'Explain your value proposition'],
    correct: 1,
  },
  {
    id: 'q2',
    question: 'What does discovery in sales mean?',
    options: ['Finding competitors', 'Understanding customer needs and pain points', 'Discovering new products', 'Creating solutions'],
    correct: 1,
  },
  {
    id: 'q3',
    question: 'The best time to mention price is:',
    options: ['At the start of the call', 'After you understand their needs', 'Only if asked', 'Near the end of the presentation'],
    correct: 1,
  },
]

const voicePrompts = [
  'You have 2 minutes to pitch our project management software to a busy operations manager who is skeptical about implementation complexity.',
  'A customer just said "Your solution is good but your competitor offers 30% more features." Respond and overcome this objection.',
  'Guide a prospect through a discovery conversation by asking 3-4 discovery questions to understand their challenges.',
]

export function TestFlow() {
  const [stage, setStage] = useState<Stage>('select')
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [voiceIndex, setVoiceIndex] = useState(0)
  const [testCompleted, setTestCompleted] = useState(false)

  const handleStartTest = (testId: string) => {
    setSelectedTest(testId)
    setStage('mcq')
    setCurrentQuestion(0)
    setSelectedAnswers({})
  }

  const handleAnswerMCQ = (optionIdx: number) => {
    const qId = mcqQuestions[currentQuestion].id
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optionIdx }))
  }

  const handleNextQuestion = () => {
    if (currentQuestion < mcqQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setStage('voice')
      setVoiceIndex(0)
    }
  }

  const handleRecordToggle = () => {
    if (!isRecording) {
      setIsRecording(true)
      setRecordingTime(0)
      const interval = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 120) {
            clearInterval(interval)
            setIsRecording(false)
            return t
          }
          return t + 1
        })
      }, 1000)
    } else {
      setIsRecording(false)
    }
  }

  const handleNextVoice = () => {
    if (voiceIndex < voicePrompts.length - 1) {
      setVoiceIndex(voiceIndex + 1)
      setIsRecording(false)
      setRecordingTime(0)
    } else {
      setTestCompleted(true)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {/* Test Selection */}
        {stage === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold">Test Flow</h1>
              <p className="text-muted-foreground mt-2">Challenge yourself with MCQ and voice bot practice</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tests.map((test, idx) => (
                <motion.button
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStartTest(test.id)}
                  className="bg-card border border-border rounded-lg p-6 text-left hover:border-primary/50 transition-all"
                >
                  <h3 className="text-lg font-bold mb-2">{test.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{test.questions} questions</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{test.duration}</span>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <CheckCircle size={18} className="text-primary" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* MCQ Stage */}
        {stage === 'mcq' && (
          <motion.div
            key="mcq"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold">MCQ Stage</h2>
                <span className="text-sm text-muted-foreground">
                  {currentQuestion + 1}/{mcqQuestions.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestion + 1) / mcqQuestions.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Question */}
            <motion.div
              key={`q-${currentQuestion}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border rounded-lg p-8"
            >
              <h3 className="text-2xl font-bold mb-6">{mcqQuestions[currentQuestion].question}</h3>

              <div className="space-y-3">
                {mcqQuestions[currentQuestion].options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswerMCQ(idx)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedAnswers[mcqQuestions[currentQuestion].id] === idx
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedAnswers[mcqQuestions[currentQuestion].id] === idx
                            ? 'border-primary bg-primary'
                            : 'border-border'
                        }`}
                      >
                        {selectedAnswers[mcqQuestions[currentQuestion].id] === idx && (
                          <CheckCircle size={16} className="text-white" />
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Navigation */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextQuestion}
              disabled={selectedAnswers[mcqQuestions[currentQuestion].id] === undefined}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {currentQuestion === mcqQuestions.length - 1 ? 'Move to Voice Practice' : 'Next Question'}
            </motion.button>
          </motion.div>
        )}

        {/* Voice Stage */}
        {stage === 'voice' && !testCompleted && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold">Voice Bot Practice</h2>
                <span className="text-sm text-muted-foreground">
                  {voiceIndex + 1}/{voicePrompts.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  className="bg-secondary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((voiceIndex + 1) / voicePrompts.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Prompt */}
            <motion.div
              key={`voice-${voiceIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-br from-secondary/20 to-primary/10 border border-secondary/50 rounded-lg p-8"
            >
              <div className="flex items-start gap-3 mb-4">
                <Volume2 className="text-secondary mt-1" size={24} />
                <h3 className="text-xl font-bold">Practice Scenario</h3>
              </div>
              <p className="text-lg leading-relaxed">{voicePrompts[voiceIndex]}</p>
            </motion.div>

            {/* Recording Section */}
            <motion.div
              className="bg-card border border-border rounded-lg p-8 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-muted-foreground mb-6">Maximum 2 minutes</p>

              <motion.button
                whileHover={isRecording ? {} : { scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRecordToggle}
                className={`mx-auto mb-4 w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500/20 border-2 border-red-500 animate-pulse'
                    : 'bg-primary/20 border-2 border-primary hover:bg-primary/30'
                }`}
              >
                <Mic size={32} className={isRecording ? 'text-red-500' : 'text-primary'} />
              </motion.button>

              {isRecording && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg font-bold text-red-500 mb-4"
                >
                  Recording... {formatTime(recordingTime)}
                </motion.p>
              )}

              <button
                onClick={handleNextVoice}
                className="w-full py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-all"
              >
                {voiceIndex === voicePrompts.length - 1 ? 'Complete Test' : 'Next Scenario'}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Completion */}
        {testCompleted && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle size={40} className="text-emerald-400" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-2">Test Complete!</h2>
            <p className="text-muted-foreground mb-6">Great job! Your responses are being analyzed.</p>
            <button
              onClick={() => setStage('select')}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
            >
              Take Another Test
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
