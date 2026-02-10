'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface Conversation {
  id: string
  phone: string
  status: string
  last_message_at: string
  contacts: { name: string | null } | null
  messages: Array<{ content: string; direction: string }>
}

interface ConversationsListProps {
  businessId: string
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function ConversationsList({ businessId, selectedId, onSelect }: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  
  useEffect(() => {
    // Demo data - fetch from API in production
    setConversations([
      {
        id: '1',
        phone: '+1 (555) 123-4567',
        status: 'active',
        last_message_at: new Date().toISOString(),
        contacts: { name: 'John Smith' },
        messages: [{ content: 'Yes, I can come in tomorrow at 2pm', direction: 'inbound' }]
      },
      {
        id: '2',
        phone: '+1 (555) 234-5678',
        status: 'active',
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        contacts: { name: 'Sarah Johnson' },
        messages: [{ content: 'Thanks for the quote!', direction: 'inbound' }]
      },
      {
        id: '3',
        phone: '+1 (555) 345-6789',
        status: 'active',
        last_message_at: new Date(Date.now() - 7200000).toISOString(),
        contacts: null,
        messages: [{ content: 'Do you do emergency repairs?', direction: 'inbound' }]
      },
    ])
  }, [businessId])

  return (
    <div className="w-80 border-r border-ghost-border h-full flex flex-col">
      <div className="p-4 border-b border-ghost-border">
        <h2 className="text-lg font-semibold text-white">Messages</h2>
        <p className="text-sm text-ghost-muted">{conversations.length} conversations</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
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
              <span className="text-xs text-ghost-muted">
                {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-ghost-muted truncate">
              {conv.messages[0]?.content || 'No messages'}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
