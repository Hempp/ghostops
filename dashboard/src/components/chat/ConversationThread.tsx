'use client'

import { useEffect, useState, useRef } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { toast } from 'sonner'
import { getMessages, subscribeToMessages, type Message } from '@/lib/supabase'
import { MessageSkeleton } from '@/components/ui/Skeleton'

interface ConversationThreadProps {
  conversationId: string | null
  businessId: string
}

export default function ConversationThread({ conversationId, businessId }: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }

    // Fetch messages for this conversation
    async function load() {
      if (!conversationId) return
      setLoading(true)
      try {
        const data = await getMessages(conversationId)
        setMessages(data)
      } catch (err) {
        console.error('Error loading messages:', err)
        toast.error('Failed to load messages', {
          description: 'Check your connection and try again',
        })
      } finally {
        setLoading(false)
      }
    }
    load()

    // Subscribe to new messages in real-time
    const subscription = subscribeToMessages(conversationId, (newMessage) => {
      setMessages(prev => [...prev, newMessage])
      // Show toast for new incoming messages
      if (newMessage.direction === 'inbound') {
        toast('New message received', {
          description: newMessage.content.slice(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [conversationId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ghost-bg">
        <div className="text-center">
          <div className="w-16 h-16 bg-ghost-card rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-ghost-muted" />
          </div>
          <p className="text-ghost-muted">Select a conversation to view messages</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-ghost-bg">
        <div className="p-4 border-b border-ghost-border bg-ghost-card">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm">Loading...</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <MessageSkeleton />
          <MessageSkeleton outbound />
          <MessageSkeleton />
          <MessageSkeleton outbound />
          <MessageSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-ghost-bg">
      {/* Header */}
      <div className="p-4 border-b border-ghost-border bg-ghost-card">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-emerald-400 text-sm">Live - AI Agent Active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-ghost-muted py-8">
            No messages in this conversation yet.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={"flex " + (msg.direction === 'outbound' ? "justify-end" : "justify-start")}
            >
              <div className="flex items-end gap-2 max-w-[80%]">
                {msg.direction === 'inbound' && (
                  <div className="w-6 h-6 bg-ghost-border rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 text-ghost-muted" />
                  </div>
                )}
                <div className={msg.direction === 'outbound' ? "bubble-outbound" : "bubble-inbound"}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center gap-2 mt-1 opacity-60">
                    {msg.ai_generated && (
                      <div className="flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        <span className="text-xs">AI</span>
                      </div>
                    )}
                    <span className="text-xs">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                {msg.direction === 'outbound' && msg.ai_generated && (
                  <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer - Read Only */}
      <div className="p-4 border-t border-ghost-border bg-ghost-card">
        <div className="flex items-center justify-center gap-2 text-ghost-muted text-sm">
          <Bot className="w-4 h-4 text-emerald-400" />
          <span>AI Agent is handling this conversation via SMS</span>
        </div>
      </div>
    </div>
  )
}
