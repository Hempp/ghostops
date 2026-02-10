'use client'

import { useState } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import StatsOverview from '@/components/dashboard/StatsOverview'
import ConversationsList from '@/components/chat/ConversationsList'
import ConversationThread from '@/components/chat/ConversationThread'
import InvoiceTracker from '@/components/invoices/InvoiceTracker'
import ContentCalendar from '@/components/calendar/ContentCalendar'

type View = 'dashboard' | 'conversations' | 'invoices' | 'calendar' | 'settings'

export default function Dashboard() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  
  // Demo business ID - in production, get from auth
  const businessId = 'demo-business-id'

  return (
    <div className="flex h-screen">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <div className="p-6 h-full overflow-y-auto">
            <header className="mb-8">
              <h1 className="text-3xl font-serif text-white">Command Center</h1>
              <p className="text-ghost-muted mt-1">Your ghost handled 47 tasks today</p>
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
      </main>
    </div>
  )
}
