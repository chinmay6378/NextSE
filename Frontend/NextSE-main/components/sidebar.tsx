'use client'

import { motion } from 'framer-motion'
import { BarChart3, BookOpen, Brain, FileText, LogOut, Menu, Settings, Users, X, Zap } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: typeof BarChart3
  roles: Array<'admin' | 'engineer' | 'manager'>
}

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'engineer', 'manager'] },
  { href: '/admin/clients', label: 'Client Management', icon: Users, roles: ['admin'] },
  { href: '/study', label: 'Study Hub', icon: BookOpen, roles: ['engineer'] },
  { href: '/test', label: 'Test Flow', icon: Brain, roles: ['engineer'] },
  { href: '/results', label: 'Results', icon: FileText, roles: ['engineer', 'manager'] },
  { href: '/manager/review', label: 'Manager Review', icon: Settings, roles: ['manager'] },
]

const roleLabel: Record<string, string> = {
  admin: 'Administrator',
  engineer: 'Sales Engineer',
  manager: 'Manager',
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const pathname = usePathname()

  const navItems = allNavItems.filter((item) => profile && item.roles.includes(profile.role))

  const isItemActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const renderNav = (onNavigate: () => void) => (
    <nav className="flex-1 p-4 space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = isItemActive(item.href)

        return (
          <motion.div key={item.href} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive ? 'bg-primary text-primary-foreground shadow-lg' : 'text-foreground hover:bg-muted'
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          </motion.div>
        )
      })}
    </nav>
  )

  const footer = (
    <div className="p-4 border-t border-border space-y-4">
      {profile && (
        <div className="p-3 rounded-lg bg-muted">
          <p className="text-xs text-muted-foreground mb-1">Logged in as</p>
          <p className="text-sm font-semibold text-foreground truncate">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full ${profile.role === 'engineer' ? 'bg-primary' : 'bg-secondary'}`} />
            {roleLabel[profile.role] ?? profile.role}
          </p>
        </div>
      )}
      <button
        onClick={() => signOut()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors font-medium text-sm"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </div>
  )

  const logo = (
    <div className="p-6 border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Brain size={20} className="text-primary-foreground" />
        </div>
        <h1 className="font-bold text-lg">SalesPrep</h1>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-border overflow-y-auto md:hidden"
      >
        <div className="flex flex-col h-full">
          {logo}
          {renderNav(() => setIsOpen(false))}
          {footer}
        </div>
      </motion.aside>

      <aside className="hidden md:flex md:flex-col h-screen w-64 bg-sidebar border-r border-border overflow-y-auto">
        <div className="flex flex-col h-full">
          {logo}
          {renderNav(() => {})}
          {footer}
        </div>
      </aside>

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
