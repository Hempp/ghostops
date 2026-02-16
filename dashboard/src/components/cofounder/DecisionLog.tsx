'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Brain,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Clock,
  Filter,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MessageSquare,
  DollarSign,
  Users,
  Calendar,
  Zap
} from 'lucide-react'

interface Decision {
  id: string
  businessId: string
  type: string
  context: Record<string, unknown>
  decision: string
  reasoning: string
  outcome?: string
  ownerFeedback?: 'approved' | 'rejected' | 'modified'
  createdAt: Date
}

interface DecisionLogProps {
  businessId: string
}

const DECISION_TYPE_ICONS: Record<string, typeof MessageSquare> = {
  message_response: MessageSquare,
  invoice_creation: DollarSign,
  lead_followup: Users,
  pricing_suggestion: DollarSign,
  scheduling: Calendar,
  marketing: Zap,
  customer_service: MessageSquare,
  strategic: Brain,
  operational: Zap
}

const DECISION_TYPE_LABELS: Record<string, string> = {
  message_response: 'Message Response',
  invoice_creation: 'Invoice',
  lead_followup: 'Lead Follow-up',
  pricing_suggestion: 'Pricing',
  scheduling: 'Scheduling',
  marketing: 'Marketing',
  customer_service: 'Customer Service',
  strategic: 'Strategic',
  operational: 'Operational'
}

export default function DecisionLog({ businessId }: DecisionLogProps) {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [feedbackFilter, setFeedbackFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchDecisions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ businessId })
      if (typeFilter) params.append('type', typeFilter)
      if (feedbackFilter) params.append('feedback', feedbackFilter)
      params.append('limit', '50')

      const response = await fetch(`/api/cofounder/memory?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch decisions')
      }

      const data = await response.json()
      setDecisions(data.decisions.map((d: Decision & { createdAt: string }) => ({
        ...d,
        createdAt: new Date(d.createdAt)
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decisions')
    } finally {
      setLoading(false)
    }
  }, [businessId, typeFilter, feedbackFilter])

  useEffect(() => {
    fetchDecisions()
  }, [fetchDecisions])

  const handleFeedback = async (
    decisionId: string,
    feedback: 'approved' | 'rejected' | 'modified'
  ) => {
    setSubmittingFeedback(decisionId)

    try {
      const response = await fetch('/api/cofounder/memory/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, businessId, feedback })
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      // Update local state
      setDecisions(prev =>
        prev.map(d =>
          d.id === decisionId ? { ...d, ownerFeedback: feedback } : d
        )
      )
    } catch (err) {
      console.error('Error submitting feedback:', err)
    } finally {
      setSubmittingFeedback(null)
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getFeedbackIcon = (feedback?: string) => {
    switch (feedback) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'modified':
        return <Edit3 className="w-4 h-4 text-amber-400" />
      default:
        return <Clock className="w-4 h-4 text-ghost-muted" />
    }
  }

  const getFeedbackLabel = (feedback?: string) => {
    switch (feedback) {
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      case 'modified':
        return 'Modified'
      default:
        return 'Pending'
    }
  }

  if (loading && decisions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-ghost-muted">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading decision history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <AlertCircle className="w-8 h-8 mb-4" />
        <p>{error}</p>
        <button
          onClick={fetchDecisions}
          className="mt-4 px-4 py-2 bg-ghost-card border border-ghost-border rounded-lg hover:bg-ghost-border transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-ghost-border bg-ghost-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Decision Log</h2>
              <p className="text-xs text-ghost-muted">
                {decisions.length} decisions recorded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-colors ${
                showFilters || typeFilter || feedbackFilter
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-ghost-bg border-ghost-border text-ghost-muted hover:text-white'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={fetchDecisions}
              disabled={loading}
              className="p-2 rounded-lg border border-ghost-border bg-ghost-bg text-ghost-muted hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-ghost-border">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-ghost-bg border border-ghost-border rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Types</option>
              {Object.entries(DECISION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={feedbackFilter}
              onChange={(e) => setFeedbackFilter(e.target.value)}
              className="px-3 py-1.5 bg-ghost-bg border border-ghost-border rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Feedback</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="modified">Modified</option>
            </select>

            {(typeFilter || feedbackFilter) && (
              <button
                onClick={() => {
                  setTypeFilter('')
                  setFeedbackFilter('')
                }}
                className="px-3 py-1.5 text-sm text-ghost-muted hover:text-white transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Decision List */}
      <div className="flex-1 overflow-y-auto">
        {decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-ghost-muted">
            <Brain className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-1">No decisions yet</p>
            <p className="text-sm">
              Decisions made by your AI Co-Founder will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ghost-border">
            {decisions.map((decision) => {
              const Icon = DECISION_TYPE_ICONS[decision.type] || Brain
              const isExpanded = expandedId === decision.id

              return (
                <div key={decision.id} className="bg-ghost-card hover:bg-ghost-card/80 transition-colors">
                  {/* Decision Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                    className="w-full p-4 flex items-start gap-3 text-left"
                  >
                    <div className="w-8 h-8 bg-ghost-bg rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 bg-ghost-bg rounded-full text-ghost-muted">
                          {DECISION_TYPE_LABELS[decision.type] || decision.type}
                        </span>
                        <span className="text-xs text-ghost-muted">
                          {formatDate(decision.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-white line-clamp-2 mb-2">
                        {decision.decision}
                      </p>

                      <div className="flex items-center gap-2">
                        {getFeedbackIcon(decision.ownerFeedback)}
                        <span className={`text-xs ${
                          decision.ownerFeedback === 'approved' ? 'text-emerald-400' :
                          decision.ownerFeedback === 'rejected' ? 'text-red-400' :
                          decision.ownerFeedback === 'modified' ? 'text-amber-400' :
                          'text-ghost-muted'
                        }`}>
                          {getFeedbackLabel(decision.ownerFeedback)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-ghost-muted" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-ghost-muted" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="ml-11 space-y-4">
                        {/* Context */}
                        {Object.keys(decision.context).length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-ghost-muted mb-1">
                              Context
                            </h4>
                            <div className="text-sm text-ghost-text bg-ghost-bg rounded-lg p-3">
                              <pre className="whitespace-pre-wrap text-xs">
                                {JSON.stringify(decision.context, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Reasoning */}
                        <div>
                          <h4 className="text-xs font-medium text-ghost-muted mb-1">
                            AI Reasoning
                          </h4>
                          <p className="text-sm text-ghost-text bg-ghost-bg rounded-lg p-3">
                            {decision.reasoning}
                          </p>
                        </div>

                        {/* Outcome */}
                        {decision.outcome && (
                          <div>
                            <h4 className="text-xs font-medium text-ghost-muted mb-1">
                              Outcome
                            </h4>
                            <p className="text-sm text-ghost-text bg-ghost-bg rounded-lg p-3">
                              {decision.outcome}
                            </p>
                          </div>
                        )}

                        {/* Feedback Buttons */}
                        {!decision.ownerFeedback && (
                          <div className="flex items-center gap-2 pt-2">
                            <p className="text-xs text-ghost-muted mr-2">
                              Rate this decision:
                            </p>
                            <button
                              onClick={() => handleFeedback(decision.id, 'approved')}
                              disabled={submittingFeedback === decision.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/50 rounded-lg text-emerald-400 text-xs hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
                            >
                              {submittingFeedback === decision.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ThumbsUp className="w-3 h-3" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleFeedback(decision.id, 'modified')}
                              disabled={submittingFeedback === decision.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 border border-amber-500/50 rounded-lg text-amber-400 text-xs hover:bg-amber-600/30 transition-colors disabled:opacity-50"
                            >
                              {submittingFeedback === decision.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Edit3 className="w-3 h-3" />
                              )}
                              Modified
                            </button>
                            <button
                              onClick={() => handleFeedback(decision.id, 'rejected')}
                              disabled={submittingFeedback === decision.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 border border-red-500/50 rounded-lg text-red-400 text-xs hover:bg-red-600/30 transition-colors disabled:opacity-50"
                            >
                              {submittingFeedback === decision.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ThumbsDown className="w-3 h-3" />
                              )}
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
