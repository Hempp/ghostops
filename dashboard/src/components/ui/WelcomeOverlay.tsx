'use client'

import { useState, useEffect } from 'react'
import {
  Ghost,
  MessageSquare,
  Brain,
  FileText,
  Calendar,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react'

interface WelcomeOverlayProps {
  businessName?: string
  onDismiss?: () => void
}

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Smart Conversations',
    description: 'Your AI handles customer messages 24/7, booking appointments and answering questions.',
    color: 'emerald'
  },
  {
    icon: Brain,
    title: 'AI Co-Founder',
    description: 'Get insights, daily briefings, and strategic advice tailored to your business.',
    color: 'purple'
  },
  {
    icon: FileText,
    title: 'Invoice Tracking',
    description: 'Automatic payment reminders and real-time status updates.',
    color: 'blue'
  },
  {
    icon: Calendar,
    title: 'Content Calendar',
    description: 'Plan and schedule your marketing content effortlessly.',
    color: 'amber'
  }
]

const colorClasses: Record<string, { bg: string; text: string; glow: string }> = {
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/20' }
}

export default function WelcomeOverlay({ businessName, onDismiss }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(false)
  const [currentFeature, setCurrentFeature] = useState(0)

  useEffect(() => {
    // Check if user has seen the welcome overlay
    const hasSeenWelcome = localStorage.getItem('ghostops_welcome_seen')
    if (!hasSeenWelcome) {
      // Small delay for better UX
      const timer = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('ghostops_welcome_seen', 'true')
    setVisible(false)
    onDismiss?.()
  }

  const nextFeature = () => {
    if (currentFeature < FEATURES.length - 1) {
      setCurrentFeature(prev => prev + 1)
    } else {
      handleDismiss()
    }
  }

  if (!visible) return null

  const feature = FEATURES[currentFeature]
  const colors = colorClasses[feature.color]
  const Icon = feature.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-ghost-bg border border-ghost-border rounded-3xl overflow-hidden animate-fade-in-scale shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-ghost-muted hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="relative p-8 pb-6 text-center overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent" />

          <div className="relative">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-glow-strong animate-float">
              <Ghost className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-2xl font-display font-bold text-white mb-2">
              Welcome to GhostOps{businessName ? `, ${businessName}` : ''}!
            </h1>
            <p className="text-ghost-muted">
              Your AI employee is ready. Here's what it can do for you.
            </p>
          </div>
        </div>

        {/* Feature showcase */}
        <div className="px-8 pb-6">
          <div
            key={currentFeature}
            className="bg-ghost-card border border-ghost-border rounded-2xl p-6 animate-fade-in-up"
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colors.bg} shadow-lg ${colors.glow}`}>
                <Icon className={`w-7 h-7 ${colors.text}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-ghost-muted text-sm leading-relaxed">{feature.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-4">
          {FEATURES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentFeature(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentFeature
                  ? 'w-6 bg-emerald-500'
                  : i < currentFeature
                  ? 'bg-emerald-500/50'
                  : 'bg-ghost-border'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-3 text-ghost-muted hover:text-white transition-colors text-sm"
          >
            Skip tour
          </button>
          <button
            onClick={nextFeature}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-glow"
          >
            {currentFeature < FEATURES.length - 1 ? (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Get Started
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
