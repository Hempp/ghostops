'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/ui/Sidebar'
import StatsOverview from '@/components/dashboard/StatsOverview'
import ConversationsList from '@/components/chat/ConversationsList'
import ConversationThread from '@/components/chat/ConversationThread'
import InvoiceTracker from '@/components/invoices/InvoiceTracker'
import ContentCalendar from '@/components/calendar/ContentCalendar'
import SettingsPanel from '@/components/settings/SettingsPanel'
import CoFounderChat from '@/components/cofounder/CoFounderChat'
import KeyboardShortcutsHelp from '@/components/ui/KeyboardShortcutsHelp'
import { SectionErrorBoundary } from '@/components/ui/ErrorBoundary'
import { getStats } from '@/lib/supabase'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAuth } from '@/components/auth/AuthProvider'
import { Loader2, AlertCircle } from 'lucide-react'

type View = 'dashboard' | 'cofounder' | 'conversations' | 'invoices' | 'calendar' | 'settings'

export default function Dashboard() {
  const router = useRouter()
  const { user, businessId, loading } = useAuth()
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [todayTaskCount, setTodayTaskCount] = useState<number | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

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
      if (!businessId) return
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

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ghost-bg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-ghost-accent animate-spin" />
          <p className="text-ghost-muted">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (redirect is happening)
  if (!user) {
    return null
  }

  // Show error if user is authenticated but has no business
  if (!businessId) {
    return (
      <div className="flex h-screen items-center justify-center bg-ghost-bg">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
          <AlertCircle className="w-12 h-12 text-yellow-500" />
          <h1 className="text-xl font-serif text-white">No Business Found</h1>
          <p className="text-ghost-muted">
            Your account is not associated with any business. Please contact support or ensure your business account is properly set up.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        selectedConversation={selectedConversation}
        onBackToList={() => setSelectedConversation(null)}
      />

      {/* Keyboard shortcuts help modal */}
      {showShortcuts && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />
      )}

      <main className="flex-1 overflow-hidden pb-16 md:pb-0">
        {activeView === 'dashboard' && (
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            <header className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-serif text-white">Command Center</h1>
              <p className="text-ghost-muted mt-1 text-sm md:text-base">
                {todayTaskCount !== null
                  ? `Your ghost handled ${todayTaskCount} tasks today`
                  : 'Loading activity...'}
              </p>
            </header>
            <SectionErrorBoundary section="Dashboard Stats">
              <StatsOverview businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        )}

        {activeView === 'cofounder' && (
          <SectionErrorBoundary section="AI Co-Founder">
            <CoFounderChat businessId={businessId} />
          </SectionErrorBoundary>
        )}

        {activeView === 'conversations' && (
          <div className="flex flex-col md:flex-row h-full">
            <SectionErrorBoundary section="Conversations List">
              <ConversationsList
                businessId={businessId}
                selectedId={selectedConversation}
                onSelect={setSelectedConversation}
              />
            </SectionErrorBoundary>
            <SectionErrorBoundary section="Conversation Thread">
              <ConversationThread
                conversationId={selectedConversation}
                businessId={businessId}
                onBack={() => setSelectedConversation(null)}
              />
            </SectionErrorBoundary>
          </div>
        )}

        {activeView === 'invoices' && (
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            <header className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-serif text-white">Invoices</h1>
              <p className="text-ghost-muted mt-1 text-sm md:text-base">Track payments and send reminders</p>
            </header>
            <SectionErrorBoundary section="Invoice Tracker">
              <InvoiceTracker businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        )}

        {activeView === 'calendar' && (
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            <header className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-serif text-white">Content Calendar</h1>
              <p className="text-ghost-muted mt-1 text-sm md:text-base">Scheduled posts and engagement stats</p>
            </header>
            <SectionErrorBoundary section="Content Calendar">
              <ContentCalendar businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            <header className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-serif text-white">Settings</h1>
              <p className="text-ghost-muted mt-1 text-sm md:text-base">Configure your AI assistant preferences</p>
            </header>
            <SectionErrorBoundary section="Settings">
              <SettingsPanel businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        )}
      </main>
    </div>
  )
}
