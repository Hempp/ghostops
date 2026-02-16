'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Brain, User, Sparkles, TrendingUp, DollarSign, Users, Loader2, Zap, MessageCircle } from 'lucide-react'

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
  { icon: TrendingUp, text: "How can I grow faster?", prompt: "What are the top 3 things I should focus on to accelerate my business growth this month?", color: 'emerald' },
  { icon: DollarSign, text: "Review my financials", prompt: "Look at my current revenue and outstanding invoices. What should I prioritize to improve cash flow?", color: 'blue' },
  { icon: Users, text: "Help with leads", prompt: "Review my recent leads and give me a strategy to convert more of them into paying customers.", color: 'purple' },
  { icon: Sparkles, text: "Strategic advice", prompt: "As my co-founder, what's the biggest opportunity you see that I might be missing right now?", color: 'amber' },
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

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  }

  return (
    <div className="flex flex-col h-full bg-ghost-bg">
      {/* Metrics Bar - Only show when we have metrics */}
      {metrics && (
        <div className="px-5 py-3 border-b border-ghost-border bg-ghost-card/50 backdrop-blur-sm animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="group flex items-center gap-3 p-3 bg-ghost-bg/50 rounded-xl border border-ghost-border
              hover:border-emerald-500/30 transition-all duration-300">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center
                group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-ghost-muted">Weekly Revenue</p>
                <p className="text-sm font-semibold text-emerald-400">${metrics.weeklyRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="group flex items-center gap-3 p-3 bg-ghost-bg/50 rounded-xl border border-ghost-border
              hover:border-blue-500/30 transition-all duration-300">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center
                group-hover:scale-110 transition-transform duration-300">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-ghost-muted">New Leads</p>
                <p className="text-sm font-semibold text-blue-400">{metrics.weeklyLeads}</p>
              </div>
            </div>
            <div className="group flex items-center gap-3 p-3 bg-ghost-bg/50 rounded-xl border border-ghost-border
              hover:border-purple-500/30 transition-all duration-300">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center
                group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-ghost-muted">Messages</p>
                <p className="text-sm font-semibold text-purple-400">{metrics.weeklyMessages}</p>
              </div>
            </div>
            <div className="group flex items-center gap-3 p-3 bg-ghost-bg/50 rounded-xl border border-ghost-border
              hover:border-amber-500/30 transition-all duration-300">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center
                group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-ghost-muted">Outstanding</p>
                <p className="text-sm font-semibold text-amber-400">${metrics.unpaidTotal.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
            {/* Hero Icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-3xl
                flex items-center justify-center shadow-glow">
                <Brain className="w-10 h-10 text-emerald-400" />
              </div>
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-3xl border border-emerald-500/10 animate-ping"
                style={{ animationDuration: '3s' }} />
            </div>

            <h3 className="text-2xl font-display font-bold text-white mb-3 tracking-tight">
              Your AI Co-Founder
            </h3>
            <p className="text-ghost-muted mb-8 max-w-md leading-relaxed">
              I'm your strategic business partner with CEO-level expertise in your industry.
              Ask me anything about growing your business, improving operations, or strategic planning.
            </p>

            {/* Starter Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
              {STARTER_PROMPTS.map((starter, index) => {
                const colors = colorClasses[starter.color]
                return (
                  <button
                    key={index}
                    onClick={() => handleStarterPrompt(starter.prompt)}
                    className={`group flex items-center gap-3 p-4 ${colors.bg} border ${colors.border}
                      rounded-xl text-left transition-all duration-300 ease-out-expo
                      hover:translate-y-[-2px] hover:shadow-premium animate-fade-in-up`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border}
                      flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                      <starter.icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <span className="text-sm font-medium text-ghost-text group-hover:text-white transition-colors">
                      {starter.text}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`flex items-start gap-3 max-w-[85%] lg:max-w-[70%]`}>
                  {msg.role === 'assistant' && (
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl
                      flex items-center justify-center flex-shrink-0 shadow-glow">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-5 py-4 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-premium'
                        : 'bg-ghost-card/80 backdrop-blur-sm border border-ghost-border text-ghost-text'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-3 ${
                      msg.role === 'user' ? 'text-emerald-200/70' : 'text-ghost-muted'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl
                      flex items-center justify-center flex-shrink-0 shadow-premium">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl
                    flex items-center justify-center shadow-glow animate-pulse">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-ghost-card/80 backdrop-blur-sm border border-ghost-border rounded-2xl px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-ghost-muted">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Premium Input Area */}
      <form onSubmit={handleSubmit} className="p-5 border-t border-ghost-border bg-ghost-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your co-founder anything..."
              disabled={loading}
              className="w-full bg-ghost-bg/80 backdrop-blur-sm border border-ghost-border rounded-xl
                px-5 py-4 text-white placeholder:text-ghost-muted
                focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20
                transition-all duration-300 disabled:opacity-50"
            />
            {/* Subtle gradient accent when focused */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/5 via-transparent to-teal-500/5
              pointer-events-none opacity-0 focus-within:opacity-100 transition-opacity" />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="group relative p-4 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl
              hover:from-emerald-500 hover:to-emerald-600 transition-all duration-300 shadow-glow
              hover:shadow-glow-strong hover:scale-105 active:scale-100
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-glow"
          >
            <Send className={`w-5 h-5 transition-transform duration-300 ${
              loading ? 'animate-pulse' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
            }`} />
          </button>
        </div>

        {/* Quick hint */}
        <p className="text-xs text-ghost-muted mt-3 text-center">
          Press Enter to send • Your AI co-founder learns from every conversation
        </p>
      </form>
    </div>
  )
}
