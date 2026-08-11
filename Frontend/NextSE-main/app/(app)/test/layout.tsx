'use client'

import { useAuth } from '@/lib/auth'

export default function TestLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (profile.role !== 'engineer') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-2 text-center">
        <p className="text-foreground font-semibold">You don&apos;t have access to this page.</p>
        <p className="text-muted-foreground text-sm">This area is restricted to sales engineers.</p>
      </div>
    )
  }

  return <>{children}</>
}
