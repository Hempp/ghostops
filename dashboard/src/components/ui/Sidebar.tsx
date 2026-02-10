'use client'

import { 
  LayoutDashboard, 
  MessageSquare, 
  Receipt, 
  Calendar, 
  Settings,
  Ghost
} from 'lucide-react'

type View = 'dashboard' | 'conversations' | 'invoices' | 'calendar' | 'settings'

interface SidebarProps {
  activeView: View
  onViewChange: (view: View) => void
}

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'conversations', label: 'Messages', icon: MessageSquare },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'calendar', label: 'Content', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-ghost-card border-r border-ghost-border flex flex-col">
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
      
      <div className="p-4 border-t border-ghost-border">
        <div className="bg-emerald-600/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Active</span>
          </div>
          <p className="text-xs text-ghost-muted">
            Ghost is handling customer messages
          </p>
        </div>
      </div>
    </aside>
  )
}
