'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Send, Bot, User, UserCheck, Pause, Play, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  getMessages,
  getConversation,
  sendManualMessage,
  updateConversationStatus,
  subscribeToMessages,
  type Message,
  type Conversation
} from '@/lib/supabase'
import { MessageSkeleton } from '@/components/ui/Skeleton'

interface ConversationThreadProps {
  conversationId: string | null
  businessId: string
  onBack?: () => void
}

export default function ConversationThread({ conversationId, businessId, onBack }: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [isHumanMode, setIsHumanMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load conversation and messages
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setConversation(null)
      setIsHumanMode(false)
      return
    }

    async function load() {
      if (!conversationId) return
      setLoading(true)
      try {
        const [messagesData, conversationData] = await Promise.all([
          getMessages(conversationId),
          getConversation(conversationId)
        ])
        setMessages(messagesData)
        setConversation(conversationData)
        setIsHumanMode(conversationData.status === 'paused')
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

  // Focus input when entering human mode
  useEffect(() => {
    if (isHumanMode && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isHumanMode])

  const handleToggleMode = useCallback(async () => {
    if (!conversationId) return

    const newMode = !isHumanMode
    const newStatus = newMode ? 'paused' : 'active'

    try {
      await updateConversationStatus(conversationId, newStatus)
      setIsHumanMode(newMode)
      toast.success(newMode ? 'You are now in control' : 'AI Agent resumed', {
        description: newMode
          ? 'AI is paused. Send messages manually.'
          : 'AI will respond to new messages.',
      })
    } catch (err) {
      console.error('Error updating conversation status:', err)
      toast.error('Failed to update conversation mode')
    }
  }, [conversationId, isHumanMode])

  const handleSendMessage = useCallback(async () => {
    if (!conversationId || !messageInput.trim() || sending) return

    const content = messageInput.trim()
    setMessageInput('')
    setSending(true)

    try {
      await sendManualMessage(conversationId, businessId, content)
      toast.success('Message sent')
    } catch (err) {
      console.error('Error sending message:', err)
      toast.error('Failed to send message', {
        description: 'Please try again',
      })
      setMessageInput(content) // Restore message on failure
    } finally {
      setSending(false)
    }
  }, [conversationId, businessId, messageInput, sending])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  // On mobile, hide the thread when no conversation is selected
  const mobileHiddenClass = !conversationId ? 'hidden md:flex' : 'flex'

  if (!conversationId) {
    return (
      <div className={`${mobileHiddenClass} flex-1 items-center justify-center bg-ghost-bg`}>
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
      <div className={`${mobileHiddenClass} flex-1 flex-col bg-ghost-bg`}>
        {/* Mobile: add top padding for header */}
        <div className="p-4 border-b border-ghost-border bg-ghost-card mt-14 md:mt-0">
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
    <div className={`${mobileHiddenClass} flex-1 flex-col bg-ghost-bg`}>
      {/* Header with mode toggle - add top padding on mobile for fixed header */}
      <div className="p-4 border-b border-ghost-border bg-ghost-card mt-14 md:mt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isHumanMode ? (
              <>
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
                <UserCheck className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm font-medium hidden sm:inline">Human Mode - AI Paused</span>
                <span className="text-orange-400 text-sm font-medium sm:hidden">Human Mode</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <Bot className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm hidden sm:inline">AI Agent Active</span>
                <span className="text-emerald-400 text-sm sm:hidden">AI Active</span>
              </>
            )}
          </div>

          <button
            onClick={handleToggleMode}
            className={`flex items-center gap-2 px-3 py-2 md:py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] md:min-h-0 ${
              isHumanMode
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30'
            }`}
          >
            {isHumanMode ? (
              <>
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Resume AI</span>
                <span className="sm:hidden">Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                <span className="hidden sm:inline">Take Over</span>
                <span className="sm:hidden">Take Over</span>
              </>
            )}
          </button>
        </div>

        {/* Warning when in human mode */}
        {isHumanMode && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-orange-600/10 rounded-lg text-orange-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>AI responses are paused. Messages you send will be delivered via SMS.</span>
          </div>
        )}
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
              <div className="flex items-end gap-2 max-w-[85%] md:max-w-[80%]">
                {msg.direction === 'inbound' && (
                  <div className="w-6 h-6 bg-ghost-border rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 text-ghost-muted" />
                  </div>
                )}
                <div className={msg.direction === 'outbound' ? "bubble-outbound" : "bubble-inbound"}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className="flex items-center gap-2 mt-1 opacity-60">
                    {msg.ai_generated ? (
                      <div className="flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        <span className="text-xs">AI</span>
                      </div>
                    ) : msg.direction === 'outbound' && (
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        <span className="text-xs">You</span>
                      </div>
                    )}
                    <span className="text-xs">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                {msg.direction === 'outbound' && (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.ai_generated ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    {msg.ai_generated ? (
                      <Bot className="w-3 h-3 text-white" />
                    ) : (
                      <UserCheck className="w-3 h-3 text-white" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer - Input when in human mode, info when AI mode */}
      <div className="p-4 border-t border-ghost-border bg-ghost-card">
        {isHumanMode ? (
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 bg-ghost-bg border border-ghost-border rounded-lg px-4 py-3 md:py-2 text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 text-base md:text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sending}
              className="p-3 md:p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[48px] min-h-[48px] md:min-w-0 md:min-h-0 flex items-center justify-center"
            >
              <Send className={`w-5 h-5 ${sending ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-ghost-muted text-sm py-2">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>AI Agent is handling this conversation via SMS</span>
          </div>
        )}
      </div>
    </div>
  )
}
