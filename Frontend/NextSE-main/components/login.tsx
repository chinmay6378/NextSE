'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth, type UserRole } from '@/lib/auth-context'
import { toast } from 'sonner'
import { Mail, Lock, ArrowRight, Zap, Users } from 'lucide-react'

export function Login() {
  const { login, loading } = useAuth()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) {
      toast.error('Please select a login option')
      return
    }

    setIsSubmitting(true)
    try {
      await login(email, password, selectedRole)
      toast.success('Login successful!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedRole(null)
    setEmail('')
    setPassword('')
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background gradient elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-20" />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo and Title */}
        <motion.div className="text-center mb-8" variants={itemVariants}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">SalesPrep AI</h1>
          </div>
          <p className="text-muted-foreground">Master sales skills with AI-powered training</p>
        </motion.div>

        {/* Role Selection */}
        <AnimatePresence mode="wait">
          {selectedRole === null ? (
            <motion.div key="role-selection" className="space-y-4" variants={itemVariants}>
              <p className="text-center text-sm font-semibold text-foreground mb-6">
                Choose your login type
              </p>

              {/* User Login Card */}
              <motion.button
                onClick={() => setSelectedRole('user')}
                className="w-full group relative overflow-hidden rounded-lg border border-input bg-card/50 p-6 text-left transition-all hover:bg-card hover:border-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Login as User</h3>
                    <p className="text-sm text-muted-foreground">Sales rep or engineer account</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </div>
              </motion.button>

              {/* Admin Login Card */}
              <motion.button
                onClick={() => setSelectedRole('admin')}
                className="w-full group relative overflow-hidden rounded-lg border border-input bg-card/50 p-6 text-left transition-all hover:bg-card hover:border-secondary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Login as Admin</h3>
                    <p className="text-sm text-muted-foreground">Manager or training lead account</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-colors mt-1" />
                </div>
              </motion.button>

              {/* Demo Credentials */}
              <motion.div
                className="mt-8 p-4 rounded-lg bg-card/30 border border-border"
                variants={itemVariants}
              >
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Demo Credentials</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User:</span>
                    <code className="text-accent">user1@salesprep.com</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admin:</span>
                    <code className="text-accent">admin1@salesprep.com</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Password:</span>
                    <code className="text-accent">password123</code>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Back Button */}
              <button
                onClick={resetForm}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                ← Back
              </button>

              {/* Role Indicator */}
              <div className="p-4 rounded-lg bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-1">Logging in as</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedRole === 'admin' ? 'bg-secondary' : 'bg-primary'}`} />
                  <p className="font-semibold text-foreground capitalize">
                    {selectedRole === 'admin' ? 'Administrator' : 'User'}
                  </p>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user1@salesprep.com"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                      required
                      disabled={isSubmitting || loading}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="password123"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                      required
                      disabled={isSubmitting || loading}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="w-full mt-6 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isSubmitting || loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </div>
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
