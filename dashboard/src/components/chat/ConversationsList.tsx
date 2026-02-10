'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { supabase, getConversations, subscribeToConversations, type Conversation } from '@/lib/supabase'

interface ConversationsListProps {
  businessId: string
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function ConversationsList({ businessId, selectedId, onSelect }: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch initial conversations
    async function load() {
      try {
        const data = await getConversations(businessId)
        setConversations(data)
      } catch (err) {
        console.error('Error loading conversations:', err)
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

  if (loading) {
    return (
      <div className="w-80 border-r border-ghost-border h-full flex items-center justify-center">
        <div className="text-ghost-muted">Loading conversations...</div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r border-ghost-border h-full flex flex-col">
      <div className="p-4 border-b border-ghost-border">
        <h2 className="text-lg font-semibold text-white">Messages</h2>
        <p className="text-sm text-ghost-muted">{conversations.length} conversations</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-ghost-muted">
            No conversations yet. Messages will appear here when customers text your GhostOps number.
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={
                "w-full p-4 text-left border-b border-ghost-border transition-colors " +
                (selectedId === conv.id ? "bg-emerald-600/10" : "hover:bg-ghost-border/30")
              }
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">
                  {conv.contacts?.name || conv.phone}
                </span>
                {conv.last_message_at && (
                  <span className="text-xs text-ghost-muted">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={"w-2 h-2 rounded-full " +
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
