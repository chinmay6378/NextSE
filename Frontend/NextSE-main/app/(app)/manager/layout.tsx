'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/lib/auth'

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile && profile.role !== 'manager') {
      router.replace('/dashboard')
    }
  }, [loading, profile, router])

  if (loading || !profile || profile.role !== 'manager') {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
