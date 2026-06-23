'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, ChevronLeft, Lock, Mail, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { signup } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const fields = [
  { id: 'name',     label: 'Full Name',  placeholder: 'Ada Engineer',     type: 'text',     icon: User },
  { id: 'email',    label: 'Email',      placeholder: 'you@company.com',  type: 'email',    icon: Mail },
  { id: 'password', label: 'Password',   placeholder: 'At least 8 chars', type: 'password', icon: Lock },
] as const

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess]     = useState(false)
  const [focused, setFocused]     = useState<string | null>(null)
  const [error, setError]         = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(false)
    try {
      await signup({ email, password, full_name: fullName })
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      setSuccess(true)
      toast.success('Account created!')
      setTimeout(() => router.push('/dashboard'), 700)
    } catch (err) {
      setError(true)
      toast.error(err instanceof ApiError ? err.message : 'Could not create account')
      setTimeout(() => setError(false), 700)
    } finally {
      setIsSubmitting(false)
    }
  }

  const valueMap: Record<string, string> = { name: fullName, email, password }
  const setterMap: Record<string, (v: string) => void> = {
    name: setFullName,
    email: setEmail,
    password: setPassword,
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">

      {/* Ambient orbs */}
      <div
        className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(circle, oklch(0.618 0.195 38 / 0.12), transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, oklch(0.575 0.220 292 / 0.1), transparent 70%)' }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <motion.div
        className="w-full max-w-[400px] relative z-10"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Card */}
        <div className="rounded-2xl p-8 border border-border bg-card shadow-xl shadow-black/5">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-8"
          >
            <motion.div
              initial={{ scale: 0.7, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-10 h-10 shrink-0"
            >
              <div className="absolute inset-0 rounded-xl bg-orange-400/40 blur-md" />
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg">
                <img src="/icon.svg" alt="NextSE" className="w-full h-full object-cover" />
              </div>
            </motion.div>
            <div>
              <span className="font-bold text-[15px] text-foreground tracking-tight block">NextSE</span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                Training Platform
              </span>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {success ? (
              /* Success state */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center py-8"
              >
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                  <div className="relative w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-foreground">Account created!</p>
                <p className="text-sm text-muted-foreground mt-1">Taking you to your dashboard…</p>
              </motion.div>
            ) : (
              <motion.div key="form">
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[24px] font-bold text-foreground tracking-tight mb-1"
                >
                  Create account
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="text-sm text-muted-foreground mb-7"
                >
                  Start your AI-powered sales training journey
                </motion.p>

                <motion.form
                  onSubmit={handleSignup}
                  className="space-y-4"
                  animate={error ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.45 }}
                >
                  {fields.map(({ id, label, placeholder, type, icon: Icon }, i) => (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.26 + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-1.5"
                    >
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </label>
                      <div
                        className={cn(
                          'relative flex items-center rounded-xl border transition-all duration-200',
                          focused === id
                            ? 'border-primary/60 bg-primary/3 ring-3 ring-primary/10'
                            : 'border-border bg-muted/40 hover:border-muted-foreground/40',
                        )}
                      >
                        <Icon className="absolute left-3.5 w-4 h-4 text-muted-foreground shrink-0" />
                        <input
                          type={type}
                          value={valueMap[id]}
                          onChange={(e) => setterMap[id](e.target.value)}
                          onFocus={() => setFocused(id)}
                          onBlur={() => setFocused(null)}
                          placeholder={placeholder}
                          minLength={id === 'password' ? 8 : undefined}
                          className="w-full pl-10 pr-4 py-3 bg-transparent text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.47, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.018, boxShadow: '0 10px 36px oklch(0.618 0.195 38 / 0.32)' }}
                      whileTap={{ scale: 0.975 }}
                      className="w-full mt-2 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-55 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, oklch(0.618 0.195 38), oklch(0.540 0.210 15))',
                        boxShadow: '0 6px 28px oklch(0.618 0.195 38 / 0.24)',
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {isSubmitting ? (
                          <motion.span
                            key="loading"
                            className="flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating account…
                          </motion.span>
                        ) : (
                          <motion.span
                            key="idle"
                            className="flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            Create Account
                            <ArrowRight className="w-4 h-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>
                </motion.form>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 text-center text-sm text-muted-foreground"
                >
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-primary font-semibold hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Sign in
                  </Link>
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 text-center text-[11px] text-muted-foreground/40"
        >
          Your data is encrypted and never shared with third parties.
        </motion.p>
      </motion.div>
    </div>
  )
}
