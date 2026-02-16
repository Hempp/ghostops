'use client'

import {
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Calendar,
  Settings,
  Ghost,
  LogOut,
  ChevronLeft,
  Brain,
  Sparkles
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { NotificationBell } from '@/components/notifications'

type View = 'dashboard' | 'cofounder' | 'conversations' | 'invoices' | 'calendar' | 'settings'

interface SidebarProps {
  activeView: View
  onViewChange: (view: View) => void
  selectedConversation?: string | null
  onBackToList?: () => void
  businessId?: string | null
}

const navItems: { id: View; label: string; icon: React.ElementType; accent?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cofounder', label: 'Co-Founder', icon: Brain, accent: true },
  { id: 'conversations', label: 'Messages', icon: MessageSquare },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'calendar', label: 'Content', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ activeView, onViewChange, selectedConversation, onBackToList, businessId }: SidebarProps) {
  const { user, signOut, businessId: authBusinessId } = useAuth()
  const router = useRouter()

  // Use provided businessId or fall back to auth context
  const currentBusinessId = businessId ?? authBusinessId

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Desktop Sidebar
  const DesktopSidebar = () => (
    <aside className="hidden md:flex w-72 bg-ghost-card/50 backdrop-blur-xl border-r border-ghost-border flex-col">
      {/* Brand Header */}
      <div className="p-6 border-b border-ghost-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl
                flex items-center justify-center shadow-glow transition-transform duration-300 group-hover:scale-105">
                <Ghost className="w-6 h-6 text-white" />
              </div>
              {/* Status indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative block w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-ghost-card" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white tracking-tight">GhostOps</h1>
              <p className="text-xs text-ghost-muted">AI Employee</p>
            </div>
          </div>
          <NotificationBell businessId={currentBusinessId} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1.5">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            return (
              <li key={item.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`group relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                    transition-all duration-300 ease-out-expo ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-ghost-muted hover:text-white hover:bg-ghost-border/30'
                  }`}
                >
                  {/* Active indicator bar */}
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full transition-all duration-300 ${
                    isActive ? 'h-6 bg-emerald-500' : 'h-0 bg-transparent'
                  }`} />

                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-emerald-500/20'
                      : 'bg-ghost-border/30 group-hover:bg-ghost-border/50'
                  } ${item.accent && !isActive ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10' : ''}`}>
                    <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                      item.accent && !isActive ? 'text-emerald-400/70' : ''
                    }`} />
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>

                  {/* Co-Founder special badge */}
                  {item.accent && (
                    <div className="ml-auto">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                        bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                        AI
                      </span>
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Status Card & User Section */}
      <div className="p-4 border-t border-ghost-border space-y-4">
        {/* AI Status Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-teal-500/5
          rounded-xl p-4 border border-emerald-500/20">
          {/* Subtle animated gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/10 to-emerald-500/5
            animate-shimmer" style={{ backgroundSize: '200% 100%' }} />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-50" />
              </div>
              <span className="text-emerald-400 text-sm font-semibold">Active & Learning</span>
            </div>
            <p className="text-xs text-ghost-muted leading-relaxed">
              Ghost is handling messages and improving from every interaction
            </p>
          </div>
        </div>

        {/* User info and sign out */}
        <div className="flex items-center justify-between p-3 bg-ghost-bg/50 rounded-xl border border-ghost-border">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10
              flex items-center justify-center border border-blue-500/20">
              <span className="text-xs font-semibold text-blue-400">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <p className="text-xs text-ghost-muted truncate">
              {user?.email || 'User'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2.5 text-ghost-muted hover:text-red-400 hover:bg-red-500/10
              rounded-lg transition-all duration-200"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )

  // Mobile Bottom Navigation
  const MobileBottomNav = () => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-ghost-card/95 backdrop-blur-xl
      border-t border-ghost-border z-50 pb-safe">
      <div className="flex items-stretch justify-around px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 min-h-[64px] py-2
                transition-all duration-300 ${
                isActive ? 'text-emerald-400' : 'text-ghost-muted active:bg-ghost-border/30'
              }`}
            >
              {/* Active background */}
              {isActive && (
                <div className="absolute inset-x-2 inset-y-1 bg-emerald-500/10 rounded-xl" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-300 ${
                  isActive ? 'scale-110' : ''
                }`} />
                {item.accent && (
                  <Sparkles className="absolute -top-1 -right-1 w-2.5 h-2.5 text-emerald-400" />
                )}
              </div>
              <span className={`text-[10px] font-medium mt-1 transition-colors ${
                isActive ? 'text-emerald-400' : ''
              }`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )

  // Mobile Header (shows when in conversation thread)
  const MobileHeader = () => {
    if (activeView !== 'conversations' || !selectedConversation) return null

    return (
      <div className="md:hidden fixed top-0 left-0 right-0 bg-ghost-card/95 backdrop-blur-xl
        border-b border-ghost-border z-40 safe-area-pt">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={onBackToList}
            className="flex items-center gap-2 min-h-[44px] min-w-[44px] -ml-2 pl-2 pr-3
              text-ghost-muted hover:text-white transition-all duration-200
              hover:bg-ghost-border/30 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Messages</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <DesktopSidebar />
      <MobileBottomNav />
      <MobileHeader />
    </>
  )
}
