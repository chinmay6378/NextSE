'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart2,
  Building2,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  description: string
  icon: typeof BarChart2
  roles: Array<'admin' | 'engineer' | 'manager'>
}

const allNavItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Overview & metrics',
    icon: LayoutDashboard,
    roles: ['admin', 'engineer', 'manager'],
  },
  {
    href: '/admin/clients',
    label: 'Clients',
    description: 'Manage accounts',
    icon: Building2,
    roles: ['admin'],
  },
  {
    href: '/admin/engineers',
    label: 'Engineers',
    description: 'Team profiles & results',
    icon: Users,
    roles: ['admin'],
  },
  {
    href: '/admin/control-panel',
    label: 'Control Panel',
    description: 'Assign & monitor all',
    icon: ShieldCheck,
    roles: ['admin'],
  },
  {
    href: '/results',
    label: 'Results',
    description: 'All engineer results',
    icon: BarChart2,
    roles: ['admin', 'manager'],
  },
  {
    href: '/study',
    label: 'Study Hub',
    description: 'Learn & practise',
    icon: GraduationCap,
    roles: ['engineer'],
  },
  {
    href: '/test',
    label: 'Assessments',
    description: 'MCQ test sessions',
    icon: ClipboardList,
    roles: ['engineer'],
  },
  {
    href: '/practice',
    label: 'Practice Pitch',
    description: 'AI voice role-play',
    icon: Mic,
    roles: ['engineer'],
  },
  {
    href: '/manager/review',
    label: 'Review',
    description: 'Approve submissions',
    icon: ClipboardCheck,
    roles: ['manager'],
  },
]

const roleConfig: Record<string, { label: string; gradient: string }> = {
  admin:    { label: 'Administrator',  gradient: 'from-violet-500 to-purple-600' },
  engineer: { label: 'Sales Engineer', gradient: 'from-orange-400 to-red-500' },
  manager:  { label: 'Manager',        gradient: 'from-emerald-500 to-teal-600' },
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/* ── Slim nav icon with animated tooltip ── */
function NavIcon({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const Icon = item.icon

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 outline-none',
          active
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {active && (
          <motion.span
            layoutId="navActive"
            className="absolute inset-0 rounded-xl bg-primary/10"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        {!active && hovered && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 rounded-xl bg-muted"
          />
        )}
        <Icon size={18} className="relative z-10" />
      </Link>

    </div>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const { profile, signOut } = useAuth()
  const pathname = usePathname()

  const navItems = allNavItems.filter(
    (item) => profile && item.roles.includes(profile.role),
  )
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)
  const role = profile?.role ?? 'engineer'
  const cfg = roleConfig[role] ?? roleConfig.engineer

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileOpen])

  /* ── Desktop slim sidebar ── */
  const SlimSidebar = () => (
    <aside className="hidden md:flex flex-col h-screen w-[68px] bg-sidebar border-r border-sidebar-border shrink-0 items-center py-5 gap-2 overflow-visible z-30">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5 shrink-0"
      >
        <Link href="/dashboard">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md hover:scale-105 transition-transform">
            <img src="/icon.svg" alt="NextSE" className="w-full h-full object-cover" />
          </div>
        </Link>
      </motion.div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 overflow-visible">
        {navItems.map((item, i) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 + 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-visible"
          >
            <NavIcon item={item} active={isActive(item.href)} />
          </motion.div>
        ))}
      </nav>

      {/* Profile avatar */}
      <div ref={profileRef} className="relative overflow-visible">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setProfileOpen(!profileOpen)}
          className={cn(
            'w-9 h-9 rounded-full text-white text-[11px] font-bold flex items-center justify-center shadow-sm ring-2 ring-offset-2 ring-offset-sidebar transition-all',
            profileOpen ? 'ring-primary' : 'ring-transparent',
            `bg-gradient-to-br ${cfg.gradient}`,
          )}
        >
          {getInitials(profile?.full_name ?? 'U')}
        </motion.button>

        {/* Profile popup — slides out to the right */}
        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, x: -12, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -12, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="absolute bottom-0 left-full ml-3 w-56 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-[100]"
            >
              {/* User card */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className="p-4 border-b border-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0',
                      `bg-gradient-to-br ${cfg.gradient}`,
                    )}
                  >
                    {getInitials(profile?.full_name ?? 'U')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">
                      {profile?.full_name}
                    </p>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {cfg.label}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Sign out */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
                whileHover={{ backgroundColor: 'oklch(0.980 0.015 27)' }}
                onClick={() => {
                  setProfileOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut size={14} />
                Sign Out
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )

  /* ── Mobile drawer nav links ── */
  const DrawerNav = ({ onNavigate }: { onNavigate: () => void }) => (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {navItems.map((item, i) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 + 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobileActive"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={16} className="relative z-10 shrink-0" />
              <div className="relative z-10 flex-1 min-w-0">
                <span className="block text-[13px] font-semibold leading-tight">
                  {item.label}
                </span>
                <span className="block text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {item.description}
                </span>
              </div>
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 relative z-10"
                />
              )}
            </Link>
          </motion.div>
        )
      })}
    </nav>
  )

  return (
    <>
      <SlimSidebar />

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-xl bg-card border border-border shadow-md hover:bg-muted transition-colors"
        aria-label="Toggle menu"
      >
        <AnimatePresence mode="wait">
          {mobileOpen ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={18} />
            </motion.span>
          ) : (
            <motion.span
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu size={18} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Mobile drawer */}
      <motion.aside
        initial={false}
        animate={{ x: mobileOpen ? 0 : -264 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border overflow-y-auto md:hidden shadow-2xl flex flex-col"
      >
        {/* Mobile logo header */}
        <div className="h-16 px-4 flex items-center border-b border-sidebar-border shrink-0 gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm shrink-0">
            <img src="/icon.svg" alt="NextSE" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-bold text-[14px] text-foreground tracking-tight">NextSE</span>
            <span className="block text-[9px] uppercase tracking-widest text-muted-foreground font-medium">
              Sales Engineering
            </span>
          </div>
        </div>

        <DrawerNav onNavigate={() => setMobileOpen(false)} />

        {/* Mobile profile footer */}
        <div className="p-3 border-t border-sidebar-border">
          {profile && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted border border-border">
              <div
                className={cn(
                  'w-8 h-8 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0',
                  `bg-gradient-to-br ${cfg.gradient}`,
                )}
              >
                {getInitials(profile.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                  {profile.full_name}
                </p>
                <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="w-full mt-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-30 md:hidden"
          />
        )}
      </AnimatePresence>
    </>
  )
}
