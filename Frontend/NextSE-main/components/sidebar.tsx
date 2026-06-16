'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart3, BookOpen, Brain, FileText, LogOut, Menu, Settings, X, Zap, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['user', 'admin'] },
    { id: 'profile', label: 'Create Profile', icon: Zap, roles: ['user'] },
    { id: 'study', label: 'Study Hub', icon: BookOpen, roles: ['user'] },
    { id: 'test', label: 'Test Flow', icon: Brain, roles: ['user'] },
    { id: 'results', label: 'Results', icon: FileText, roles: ['user'] },
    { id: 'admin-clients', label: 'Client Management', icon: Users, roles: ['admin'] },
    { id: 'manager', label: 'Manager Review', icon: Settings, roles: ['admin'] },
  ]

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => user && item.roles.includes(user.role))

  const handleNavClick = (id: string) => {
    onPageChange(id)
    setIsOpen(false)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-border overflow-y-auto md:hidden"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Brain size={20} className="text-primary-foreground" />
              </div>
              <h1 className="font-bold text-lg">SalesPrep</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id

              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-foreground hover:bg-muted'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </motion.button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-4">
            {/* User Info */}
            {user && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Logged in as</p>
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-secondary' : 'bg-primary'}`} />
                  {user.role === 'admin' ? 'Administrator' : 'User'}
                </p>
              </div>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors font-medium text-sm"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col h-screen w-64 bg-sidebar border-r border-border overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Brain size={20} className="text-primary-foreground" />
              </div>
              <h1 className="font-bold text-lg">SalesPrep</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id

              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-foreground hover:bg-muted'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </motion.button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-4">
            {/* User Info */}
            {user && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Logged in as</p>
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-secondary' : 'bg-primary'}`} />
                  {user.role === 'admin' ? 'Administrator' : 'User'}
                </p>
              </div>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors font-medium text-sm"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}
    </>
  )
}
