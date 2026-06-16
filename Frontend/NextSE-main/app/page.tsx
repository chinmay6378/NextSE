'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from '@/components/sidebar'
import { Login } from '@/components/login'
import { Dashboard } from '@/components/dashboard'
import { ProfileForm } from '@/components/profile-form'
import { StudyHub } from '@/components/study-hub'
import { TestFlow } from '@/components/test-flow'
import { ResultsAnalysis } from '@/components/results-analysis'
import { AdminClients } from '@/components/admin-clients'
import { ManagerReview } from '@/components/manager-review'
import { Toaster } from 'sonner'

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'profile':
        return <ProfileForm />
      case 'study':
        return <StudyHub />
      case 'test':
        return <TestFlow />
      case 'results':
        return <ResultsAnalysis />
      case 'admin-clients':
        return <AdminClients />
      case 'manager':
        return <ManagerReview />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main Content */}
      <main className="flex-1 pt-16 md:pt-0">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-full p-4 md:p-8 max-w-7xl mx-auto w-full"
        >
          {renderPage()}
        </motion.div>
      </main>

      <Toaster theme="dark" />
    </div>
  )
}
