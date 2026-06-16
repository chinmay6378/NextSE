'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Step {
  id: number
  title: string
  description: string
  fields: string[]
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Personal Information',
    description: 'Let&apos;s start with your basics',
    fields: ['Full Name', 'Email', 'Phone Number'],
  },
  {
    id: 2,
    title: 'Sales Experience',
    description: 'Tell us about your background',
    fields: ['Years in Sales', 'Current Role', 'Industry'],
  },
  {
    id: 3,
    title: 'Learning Goals',
    description: 'What do you want to improve?',
    fields: ['Weak Areas', 'Target Skills', 'Timeline'],
  },
  {
    id: 4,
    title: 'Preferences',
    description: 'Personalize your experience',
    fields: ['Preferred Study Time', 'Difficulty Level', 'Voice Coaching'],
  },
]

export function ProfileForm() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    console.log('Form submitted:', formData)
  }

  const step = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2">Create Your Profile</h1>
        <p className="text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
      </motion.div>

      {/* Progress Bar */}
      <motion.div className="mt-6 mb-8">
        <div className="flex gap-2 mb-3">
          {steps.map((_, idx) => (
            <motion.div
              key={idx}
              className={`flex-1 h-1 rounded-full transition-colors ${
                idx <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
              layoutId={`progress-${idx}`}
            />
          ))}
        </div>
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-lg p-8 mb-8"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
            <p className="text-muted-foreground mb-6">{step.description}</p>
          </motion.div>

          {/* Form Fields */}
          <div className="space-y-4">
            {step.fields.map((field, idx) => (
              <motion.div
                key={field}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
              >
                <label className="block text-sm font-medium mb-2">{field}</label>
                <input
                  type="text"
                  placeholder={`Enter your ${field.toLowerCase()}`}
                  value={formData[field] || ''}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-4 justify-between">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft size={18} />
          Previous
        </motion.button>

        {currentStep === steps.length - 1 ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <Check size={18} />
            Complete Profile
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Next
            <ArrowRight size={18} />
          </motion.button>
        )}
      </div>
    </div>
  )
}
