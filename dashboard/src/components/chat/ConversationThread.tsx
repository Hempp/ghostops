'use client'

import { useEffect, useState, useRef } from 'react'
import { Send, Bot } from 'lucide-react'

interface Message {
  id: string
  content: string
  direction: 'inbound' | 'outbound'
  ai_generated: boolean
  created_at: string
}

interface ConversationThreadProps {
  conversationId: string | null
  businessId: string
}

export default function ConversationThread({ conversationId, businessId }: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!conversationId) return
    
    // Demo data
    setMessages([
      { id: '1', content: 'Hi, I saw your ad on Google. Do you do kitchen renovations?', direction: 'inbound', ai_generated: false, created_at: new Date(Date.now() - 600000).toISOString() },
      { id: '2', content: 'Hi there! Yes, we specialize in kitchen renovations. What kind of project are you looking at?', direction: 'outbound', ai_generated: true, created_at: new Date(Date.now() - 540000).toISOString() },
      { id: '3', content: 'Complete remodel. New cabinets, countertops, backsplash', direction: 'inbound', ai_generated: false, created_at: new Date(Date.now() - 480000).toISOString() },
      { id: '4', content: 'Sounds great! We can definitely help with a full kitchen remodel. Would you like to schedule a free estimate? We have availability this week.', direction: 'outbound', ai_generated: true, created_at: new Date(Date.now() - 420000).toISOString() },
      { id: '5', content: 'Yes, I can come in tomorrow at 2pm', direction: 'inbound', ai_generated: false, created_at: new Date(Date.now() - 360000).toISOString() },
      { id: '6', content: 'Perfect! I have you down for tomorrow at 2pm for a kitchen remodel estimate. We will send you a confirmation shortly. See you then!', direction: 'outbound', ai_generated: true, created_at: new Date(Date.now() - 300000).toISOString() },
    ])
  }, [conversationId])
  
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

  return (
    <div className="flex-1 flex flex-col bg-ghost-bg">
      {/* Header */}
      <div className="p-4 border-b border-ghost-border bg-ghost-card">
        <h3 className="font-medium text-white">John Smith</h3>
        <p className="text-sm text-ghost-muted">+1 (555) 123-4567</p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              "flex " + (msg.direction === 'outbound' ? "justify-end" : "justify-start")
            }
          >
            <div className={
              msg.direction === 'outbound' ? "bubble-outbound" : "bubble-inbound"
            }>
              <p>{msg.content}</p>
              {msg.ai_generated && (
                <div className="flex items-center gap-1 mt-1 opacity-60">
                  <Bot className="w-3 h-3" />
                  <span className="text-xs">AI</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-ghost-border bg-ghost-card">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-ghost-bg border border-ghost-border rounded-xl px-4 py-3 text-white placeholder-ghost-muted focus:outline-none focus:border-emerald-600"
          />
          <button className="bg-emerald-600 text-white px-4 py-3 rounded-xl hover:bg-emerald-700 transition-colors">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
