'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, role: UserRole) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user database
const mockUsers: Record<string, { password: string; user: User }> = {
  'user1@salesprep.com': {
    password: 'password123',
    user: {
      id: 'user1',
      email: 'user1@salesprep.com',
      name: 'John Sales Rep',
      role: 'user',
    },
  },
  'user2@salesprep.com': {
    password: 'password123',
    user: {
      id: 'user2',
      email: 'user2@salesprep.com',
      name: 'Sarah Engineer',
      role: 'user',
    },
  },
  'admin1@salesprep.com': {
    password: 'password123',
    user: {
      id: 'admin1',
      email: 'admin1@salesprep.com',
      name: 'Mike Manager',
      role: 'admin',
    },
  },
  'admin2@salesprep.com': {
    password: 'password123',
    user: {
      id: 'admin2',
      email: 'admin2@salesprep.com',
      name: 'Lisa Training Lead',
      role: 'admin',
    },
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('salesprep_user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('salesprep_user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string, role: UserRole) => {
    setLoading(true)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))

    const userData = mockUsers[email]

    if (!userData || userData.password !== password) {
      setLoading(false)
      throw new Error('Invalid email or password')
    }

    if (userData.user.role !== role) {
      setLoading(false)
      throw new Error(`This account is registered as ${userData.user.role}`)
    }

    setUser(userData.user)
    localStorage.setItem('salesprep_user', JSON.stringify(userData.user))
    setLoading(false)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('salesprep_user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
