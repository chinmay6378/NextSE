'use client'

import type { Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

import { getMe } from '@/lib/api/auth'
import type { Profile } from '@/lib/api/types'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAuthenticated: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function setRoleCookie(role: string | null) {
  if (role) {
    document.cookie = `app_role=${role}; path=/; max-age=2592000; samesite=lax`
  } else {
    document.cookie = 'app_role=; path=/; max-age=0'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadProfile = useCallback(async () => {
    try {
      const me = await getMe()
      setProfile(me)
      setRoleCookie(me.role)
    } catch {
      setProfile(null)
      setRoleCookie(null)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let active = true
    let settled = false

    // If the auth state never settles (Supabase token refresh can stall), unblock
    // the UI after 4 seconds and send the user to /login for a clean re-auth.
    const safetyTimer = setTimeout(() => {
      if (active && !settled) {
        settled = true
        setLoading(false)
        window.location.href = '/login'
      }
    }, 4000)

    // onAuthStateChange fires immediately with the current session on subscribe
    // (in addition to future changes), so this alone covers both the initial
    // load and subsequent sign-in/sign-out/token-refresh events. Previously this
    // was paired with a separate getSession().then(...) call that also invoked
    // loadProfile(), causing two concurrent /me requests on every mount — if the
    // second one failed for any transient reason, its catch block would null out
    // a profile that had just loaded correctly a moment earlier.
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return
      clearTimeout(safetyTimer)
      settled = true
      setSession(newSession)
      if (newSession) {
        await loadProfile()
      } else {
        setProfile(null)
        setRoleCookie(null)
      }
      setLoading(false)
    })

    return () => {
      active = false
      clearTimeout(safetyTimer)
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setRoleCookie(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        isAuthenticated: !!session,
        refreshProfile: loadProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
