'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Brain, User, Sparkles, TrendingUp, DollarSign, Users, Loader2 } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Metrics {
  weeklyLeads: number
  weeklyMessages: number
  weeklyRevenue: number
  unpaidTotal: number
  monthlyRevenue: number
}

interface CoFounderChatProps {
  businessId: string
}

const STARTER_PROMPTS = [
  { icon: TrendingUp, text: "How can I grow faster?", prompt: "What are the top 3 things I should focus on to accelerate my business growth this month?" },
  { icon: DollarSign, text: "Review my financials", prompt: "Look at my current revenue and outstanding invoices. What should I prioritize to improve cash flow?" },
  { icon: Users, text: "Help with leads", prompt: "Review my recent leads and give me a strategy to convert more of them into paying customers." },
  { icon: Sparkles, text: "Strategic advice", prompt: "As my co-founder, what's the biggest opportunity you see that I might be missing right now?" },
]

export default function CoFounderChat({ businessId }: CoFounderChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || loading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await fetch('/api/cofounder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          conversationHistory,
          businessId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      if (data.metrics) {
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I apologize, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }, [businessId, loading, messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleStarterPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  return (
    <div className="flex flex-col h-full bg-ghost-bg">
      {/* Header with metrics */}
      <div className="p-4 border-b border-ghost-border bg-ghost-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Co-Founder</h2>
            <p className="text-xs text-ghost-muted">Your strategic business partner</p>
          </div>
        </div>

        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-ghost-bg/50 rounded-lg p-2">
              <p className="text-ghost-muted">Weekly Revenue</p>
              <p className="text-emerald-400 font-semibold">${metrics.weeklyRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-ghost-bg/50 rounded-lg p-2">
              <p className="text-ghost-muted">New Leads</p>
              <p className="text-blue-400 font-semibold">{metrics.weeklyLeads}</p>
            </div>
            <div className="bg-ghost-bg/50 rounded-lg p-2">
              <p className="text-ghost-muted">Messages</p>
              <p className="text-purple-400 font-semibold">{metrics.weeklyMessages}</p>
            </div>
            <div className="bg-ghost-bg/50 rounded-lg p-2">
              <p className="text-ghost-muted">Outstanding</p>
              <p className="text-orange-400 font-semibold">${metrics.unpaidTotal.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-full flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Your AI Co-Founder</h3>
            <p className="text-ghost-muted mb-6 max-w-md">
              I'm your strategic business partner with CEO-level expertise in your industry.
              Ask me anything about growing your business, improving operations, or strategic planning.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {STARTER_PROMPTS.map((starter, index) => (
                <button
                  key={index}
                  onClick={() => handleStarterPrompt(starter.prompt)}
                  className="flex items-center gap-3 p-3 bg-ghost-card hover:bg-ghost-card/80 border border-ghost-border rounded-lg text-left transition-colors group"
                >
                  <starter.icon className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />
                  <span className="text-sm text-ghost-text group-hover:text-white">{starter.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-3 max-w-[85%] md:max-w-[75%]`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-ghost-card border border-ghost-border text-ghost-text'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-emerald-200' : 'text-ghost-muted'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-ghost-card border border-ghost-border rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-ghost-muted">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-ghost-border bg-ghost-card">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your co-founder anything..."
            disabled={loading}
            className="flex-1 bg-ghost-bg border border-ghost-border rounded-lg px-4 py-3 text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </form>
    </div>
  )
}
