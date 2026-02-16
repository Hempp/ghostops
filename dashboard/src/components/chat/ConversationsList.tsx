'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, getConversations, subscribeToConversations, type Conversation } from '@/lib/supabase'
import { ConversationItemSkeleton } from '@/components/ui/Skeleton'

interface ConversationsListProps {
  businessId: string
  selectedId: string | null
  onSelect: (id: string) => void
}

type StatusFilter = 'all' | 'active' | 'paused' | 'closed'

export default function ConversationsList({ businessId, selectedId, onSelect }: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    // Fetch initial conversations
    async function load() {
      try {
        const data = await getConversations(businessId)
        setConversations(data)
      } catch (err) {
        console.error('Error loading conversations:', err)
        toast.error('Failed to load conversations', {
          description: 'Check your connection and try again',
          action: {
            label: 'Retry',
            onClick: () => load()
          }
        })
      } finally {
        setLoading(false)
      }
    }
    load()

    // Subscribe to real-time updates
    const subscription = subscribeToConversations(businessId, (updated) => {
      setConversations(prev => {
        const exists = prev.find(c => c.id === updated.id)
        if (exists) {
          return prev.map(c => c.id === updated.id ? { ...c, ...updated } : c)
            .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        }
        return [updated, ...prev]
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [businessId])

  // Filter conversations by search query and status
  const filteredConversations = conversations.filter(conv => {
    // Apply status filter
    if (statusFilter !== 'all' && conv.status !== statusFilter) return false

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const name = conv.contacts?.name?.toLowerCase() || ''
      const phone = conv.phone?.toLowerCase() || ''
      return name.includes(query) || phone.includes(query)
    }

    return true
  })

  // Count by status for filter badges
  const statusCounts = {
    all: conversations.length,
    active: conversations.filter(c => c.status === 'active').length,
    paused: conversations.filter(c => c.status === 'paused').length,
    closed: conversations.filter(c => c.status === 'closed').length,
  }

  // On mobile, hide the list when a conversation is selected
  const mobileHiddenClass = selectedId ? 'hidden md:flex' : 'flex'

  if (loading) {
    return (
      <div className={`${mobileHiddenClass} w-full md:w-80 border-r border-ghost-border h-full flex-col`}>
        <div className="p-4 border-b border-ghost-border">
          <h2 className="text-lg font-semibold text-white">Messages</h2>
          <p className="text-sm text-ghost-muted">Loading...</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {[...Array(5)].map((_, i) => (
            <ConversationItemSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`${mobileHiddenClass} w-full md:w-80 border-r border-ghost-border h-full flex-col`}>
      <div className="p-4 border-b border-ghost-border">
        <h2 className="text-lg font-semibold text-white">Messages</h2>
        <p className="text-sm text-ghost-muted">{conversations.length} conversations</p>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-muted" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-ghost-bg border border-ghost-border rounded-lg pl-9 pr-3 py-2.5 md:py-2 text-sm text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-1 mt-3">
          {(['all', 'active', 'paused'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 px-2 py-2 md:py-1.5 rounded text-xs font-medium transition-colors min-h-[44px] md:min-h-0 ${
                statusFilter === status
                  ? status === 'active'
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : status === 'paused'
                    ? 'bg-orange-600/20 text-orange-400'
                    : 'bg-ghost-border text-white'
                  : 'text-ghost-muted hover:bg-ghost-border/50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {statusCounts[status] > 0 && (
                <span className="ml-1 opacity-70">({statusCounts[status]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 && searchQuery ? (
          <div className="p-4 text-center text-ghost-muted">
            No conversations matching "{searchQuery}"
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-ghost-muted">
            No conversations yet. Messages will appear here when customers text your GhostOps number.
          </div>
        ) : (
          filteredConversations.map((conv, index) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={
                "w-full p-4 text-left border-b border-ghost-border transition-all min-h-[72px] active:bg-ghost-border/50 animate-fade-in-up " +
                (selectedId === conv.id ? "bg-emerald-600/10" : "hover:bg-ghost-border/30")
              }
              style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white truncate pr-2">
                  {conv.contacts?.name || conv.phone}
                </span>
                {conv.last_message_at && (
                  <span className="text-xs text-ghost-muted flex-shrink-0">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={"w-2 h-2 rounded-full flex-shrink-0 " +
                  (conv.status === 'active' ? 'bg-emerald-500' : 'bg-ghost-muted')} />
                <span className="text-sm text-ghost-muted capitalize">{conv.status}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
