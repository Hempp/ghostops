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
  Brain
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'

type View = 'dashboard' | 'cofounder' | 'conversations' | 'invoices' | 'calendar' | 'settings'

interface SidebarProps {
  activeView: View
  onViewChange: (view: View) => void
  selectedConversation?: string | null
  onBackToList?: () => void
}

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cofounder', label: 'Co-Founder', icon: Brain },
  { id: 'conversations', label: 'Messages', icon: MessageSquare },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'calendar', label: 'Content', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ activeView, onViewChange, selectedConversation, onBackToList }: SidebarProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Desktop Sidebar
  const DesktopSidebar = () => (
    <aside className="hidden md:flex w-64 bg-ghost-card border-r border-ghost-border flex-col">
      <div className="p-6 border-b border-ghost-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Ghost className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-xl text-white">GhostOps</h1>
            <p className="text-xs text-ghost-muted">AI Employee</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all " +
                    (isActive
                      ? "bg-emerald-600/20 text-emerald-400"
                      : "text-ghost-muted hover:text-white hover:bg-ghost-border/50")
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-ghost-border space-y-3">
        <div className="bg-emerald-600/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Active</span>
          </div>
          <p className="text-xs text-ghost-muted">
            Ghost is handling customer messages
          </p>
        </div>

        {/* User info and sign out */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ghost-muted truncate">
              {user?.email || 'User'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-ghost-muted hover:text-white hover:bg-ghost-border/50 rounded-lg transition-colors"
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-ghost-card border-t border-ghost-border z-50 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={
                "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-all " +
                (isActive
                  ? "text-emerald-400"
                  : "text-ghost-muted")
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
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
      <div className="md:hidden fixed top-0 left-0 right-0 bg-ghost-card border-b border-ghost-border z-40 safe-area-pt">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={onBackToList}
            className="flex items-center gap-2 min-h-[44px] min-w-[44px] -ml-2 pl-2 pr-3 text-ghost-muted hover:text-white transition-colors"
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
