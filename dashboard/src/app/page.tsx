'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import StatsOverview from '@/components/dashboard/StatsOverview'
import ConversationsList from '@/components/chat/ConversationsList'
import ConversationThread from '@/components/chat/ConversationThread'
import InvoiceTracker from '@/components/invoices/InvoiceTracker'
import ContentCalendar from '@/components/calendar/ContentCalendar'
import SettingsPanel from '@/components/settings/SettingsPanel'
import KeyboardShortcutsHelp from '@/components/ui/KeyboardShortcutsHelp'
import { getStats } from '@/lib/supabase'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

type View = 'dashboard' | 'conversations' | 'invoices' | 'calendar' | 'settings'

export default function Dashboard() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [todayTaskCount, setTodayTaskCount] = useState<number | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Demo business ID - in production, get from auth
  const businessId = 'demo-business-id'

  // Focus search input callback
  const handleSearch = useCallback(() => {
    // Switch to conversations view and focus search
    if (activeView !== 'conversations') {
      setActiveView('conversations')
    }
    // Focus happens after render via ref in ConversationsList
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder="Search contacts..."]') as HTMLInputElement
      searchInput?.focus()
    }, 100)
  }, [activeView])

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    onViewChange: setActiveView,
    onSearch: handleSearch,
  })

  // Fetch today's task count for the header
  useEffect(() => {
    async function loadTaskCount() {
      try {
        const stats = await getStats(businessId, 1)
        if (stats.length > 0) {
          const today = stats[0]
          const totalTasks = today.messages_sent + today.messages_received + today.new_leads
          setTodayTaskCount(totalTasks)
        }
      } catch {
        // Silently fail - this is just for display
      }
    }
    loadTaskCount()
  }, [businessId])

  // Toggle shortcuts help with ?
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setShowShortcuts(prev => !prev)
        }
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Keyboard shortcuts help modal */}
      {showShortcuts && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />
      )}

      <main className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <div className="p-6 h-full overflow-y-auto">
            <header className="mb-8">
              <h1 className="text-3xl font-serif text-white">Command Center</h1>
              <p className="text-ghost-muted mt-1">
                {todayTaskCount !== null
                  ? `Your ghost handled ${todayTaskCount} tasks today`
                  : 'Loading activity...'}
              </p>
            </header>
            <StatsOverview businessId={businessId} />
          </div>
        )}
        
        {activeView === 'conversations' && (
          <div className="flex h-full">
            <ConversationsList 
              businessId={businessId}
              selectedId={selectedConversation}
              onSelect={setSelectedConversation}
            />
            <ConversationThread 
              conversationId={selectedConversation}
              businessId={businessId}
            />
          </div>
        )}
        
        {activeView === 'invoices' && (
          <div className="p-6 h-full overflow-y-auto">
            <header className="mb-8">
              <h1 className="text-3xl font-serif text-white">Invoices</h1>
              <p className="text-ghost-muted mt-1">Track payments and send reminders</p>
            </header>
            <InvoiceTracker businessId={businessId} />
          </div>
        )}
        
        {activeView === 'calendar' && (
          <div className="p-6 h-full overflow-y-auto">
            <header className="mb-8">
              <h1 className="text-3xl font-serif text-white">Content Calendar</h1>
              <p className="text-ghost-muted mt-1">Scheduled posts and engagement stats</p>
            </header>
            <ContentCalendar businessId={businessId} />
          </div>
        )}

        {activeView === 'settings' && (
          <div className="p-6 h-full overflow-y-auto">
            <header className="mb-8">
              <h1 className="text-3xl font-serif text-white">Settings</h1>
              <p className="text-ghost-muted mt-1">Configure your AI assistant preferences</p>
            </header>
            <SettingsPanel businessId={businessId} />
          </div>
        )}
      </main>
    </div>
  )
}
