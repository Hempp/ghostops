'use client'

import { useState } from 'react'
import {
  DollarSign,
  MessageSquare,
  Star,
  Calendar,
  AlertTriangle,
  Check,
  X,
  Edit2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Send
} from 'lucide-react'
import type { CoFounderAction, ActionType } from '@/lib/cofounder/actions'

interface ActionCardProps {
  action: CoFounderAction
  onApprove: (actionId: string) => Promise<void>
  onReject: (actionId: string) => Promise<void>
  onEdit?: (actionId: string, newDetails: Record<string, unknown>) => Promise<void>
  onExecute?: (actionId: string) => Promise<void>
  isSelected?: boolean
  onSelect?: (actionId: string, selected: boolean) => void
}

const ACTION_ICONS: Record<ActionType, typeof DollarSign> = {
  payment_reminder: DollarSign,
  lead_response: MessageSquare,
  review_reply: Star,
  schedule_optimization: Calendar,
  alert: AlertTriangle
}

const ACTION_COLORS: Record<ActionType, { bg: string; text: string; border: string }> = {
  payment_reminder: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30'
  },
  lead_response: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30'
  },
  review_reply: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30'
  },
  schedule_optimization: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30'
  },
  alert: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30'
  }
}

const PRIORITY_BADGES: Record<string, { bg: string; text: string }> = {
  urgent: { bg: 'bg-red-600', text: 'text-white' },
  high: { bg: 'bg-orange-500', text: 'text-white' },
  medium: { bg: 'bg-yellow-500', text: 'text-black' },
  low: { bg: 'bg-gray-500', text: 'text-white' }
}

const ACTION_LABELS: Record<ActionType, string> = {
  payment_reminder: 'Payment Reminder',
  lead_response: 'Lead Response',
  review_reply: 'Review Reply',
  schedule_optimization: 'Schedule Optimization',
  alert: 'Alert'
}

export default function ActionCard({
  action,
  onApprove,
  onReject,
  onEdit,
  onExecute,
  isSelected,
  onSelect
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState<'approve' | 'reject' | 'execute' | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedMessage, setEditedMessage] = useState('')

  const Icon = ACTION_ICONS[action.type] || AlertTriangle
  const colors = ACTION_COLORS[action.type] || ACTION_COLORS.alert
  const priorityStyle = PRIORITY_BADGES[action.priority] || PRIORITY_BADGES.medium

  const handleApprove = async () => {
    setLoading('approve')
    try {
      await onApprove(action.id)
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading('reject')
    try {
      await onReject(action.id)
    } finally {
      setLoading(null)
    }
  }

  const handleExecute = async () => {
    if (!onExecute) return
    setLoading('execute')
    try {
      await onExecute(action.id)
    } finally {
      setLoading(null)
    }
  }

  const handleEdit = async () => {
    if (!onEdit || !editedMessage) return

    const detailsKey = action.type === 'payment_reminder'
      ? 'suggested_message'
      : action.type === 'lead_response'
        ? 'suggested_response'
        : 'suggested_reply'

    await onEdit(action.id, { [detailsKey]: editedMessage })
    setIsEditing(false)
  }

  const startEditing = () => {
    const currentMessage = action.details.suggested_message
      || action.details.suggested_response
      || action.details.suggested_reply
      || ''
    setEditedMessage(currentMessage)
    setIsEditing(true)
  }

  const getSuggestedContent = () => {
    return action.details.suggested_message
      || action.details.suggested_response
      || action.details.suggested_reply
      || action.details.alert_message
      || ''
  }

  const getRecipientInfo = () => {
    if (action.details.contact_name || action.details.contact_phone) {
      return {
        name: action.details.contact_name || 'Unknown',
        phone: action.details.contact_phone || ''
      }
    }
    return null
  }

  const recipient = getRecipientInfo()
  const suggestedContent = getSuggestedContent()

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div
      className={`
        bg-ghost-card border rounded-xl overflow-hidden transition-all duration-200
        ${action.status === 'pending' ? 'border-ghost-border hover:border-ghost-border/80' : ''}
        ${action.status === 'approved' ? 'border-emerald-500/30 bg-emerald-500/5' : ''}
        ${action.status === 'executed' ? 'border-gray-500/30 bg-gray-500/5 opacity-75' : ''}
        ${action.status === 'rejected' ? 'border-red-500/30 bg-red-500/5 opacity-75' : ''}
        ${isSelected ? 'ring-2 ring-emerald-500' : ''}
      `}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Checkbox for bulk selection */}
            {onSelect && action.status === 'pending' && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelect(action.id, e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-ghost-border bg-ghost-bg text-emerald-500 focus:ring-emerald-500"
              />
            )}

            {/* Icon */}
            <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
              <Icon className={`w-5 h-5 ${colors.text}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white">
                  {ACTION_LABELS[action.type]}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                  {action.priority}
                </span>
                {action.status !== 'pending' && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                    ${action.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                    ${action.status === 'executed' ? 'bg-blue-500/20 text-blue-400' : ''}
                    ${action.status === 'rejected' ? 'bg-red-500/20 text-red-400' : ''}
                  `}>
                    {action.status}
                  </span>
                )}
              </div>

              {/* Recipient */}
              {recipient && (
                <p className="text-sm text-ghost-muted mt-1">
                  To: <span className="text-ghost-text">{recipient.name}</span>
                  {recipient.phone && (
                    <span className="text-ghost-muted"> ({recipient.phone})</span>
                  )}
                </p>
              )}

              {/* Amount for payment reminders */}
              {action.type === 'payment_reminder' && action.details.amount_cents && (
                <p className="text-sm mt-1">
                  <span className="text-ghost-muted">Amount:</span>{' '}
                  <span className="text-emerald-400 font-medium">
                    ${(action.details.amount_cents / 100).toFixed(2)}
                  </span>
                  {action.details.days_overdue && action.details.days_overdue > 0 && (
                    <span className="text-orange-400 ml-2">
                      ({action.details.days_overdue} days overdue)
                    </span>
                  )}
                </p>
              )}

              {/* Rating for review replies */}
              {action.type === 'review_reply' && action.details.review_rating !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= (action.details.review_rating || 0)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                  <span className="text-sm text-ghost-muted ml-2">
                    on {action.details.review_platform}
                  </span>
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-1 mt-2 text-xs text-ghost-muted">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(action.created_at)}
              </div>
            </div>
          </div>

          {/* Expand/Collapse */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-ghost-border/50 rounded transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-ghost-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-ghost-muted" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-ghost-border/50 pt-4">
          {/* AI Reasoning */}
          <div>
            <h4 className="text-sm font-medium text-ghost-muted mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              AI Reasoning
            </h4>
            <p className="text-sm text-ghost-text bg-ghost-bg/50 rounded-lg p-3 border border-ghost-border/50">
              {action.reasoning}
            </p>
          </div>

          {/* Review Text (for review replies) */}
          {action.type === 'review_reply' && action.details.review_text && (
            <div>
              <h4 className="text-sm font-medium text-ghost-muted mb-2">Original Review</h4>
              <p className="text-sm text-ghost-text bg-ghost-bg/50 rounded-lg p-3 border border-ghost-border/50 italic">
                "{action.details.review_text}"
              </p>
            </div>
          )}

          {/* Suggested Content / Message Preview */}
          {suggestedContent && (
            <div>
              <h4 className="text-sm font-medium text-ghost-muted mb-2 flex items-center gap-2">
                <Send className="w-4 h-4" />
                Suggested {action.type === 'review_reply' ? 'Reply' : 'Message'}
              </h4>
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    className="w-full bg-ghost-bg border border-ghost-border rounded-lg p-3 text-sm text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    rows={4}
                    placeholder="Edit message..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-sm text-ghost-muted hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEdit}
                      className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-ghost-bg/50 rounded-lg p-3 border border-ghost-border/50">
                  <p className="text-sm text-white whitespace-pre-wrap">{suggestedContent}</p>
                  {onEdit && action.status === 'pending' && (
                    <button
                      onClick={startEditing}
                      className="mt-2 flex items-center gap-1 text-xs text-ghost-muted hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit message
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Execution Result */}
          {action.execution_result && (
            <div>
              <h4 className="text-sm font-medium text-ghost-muted mb-2">Execution Result</h4>
              <div className={`rounded-lg p-3 border text-sm ${
                action.execution_result.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {action.execution_result.message}
                {action.execution_result.external_id && (
                  <p className="text-xs mt-1 opacity-75">
                    ID: {action.execution_result.external_id}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {action.status === 'pending' && (
        <div className="px-4 pb-4 flex gap-2 justify-end">
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50"
          >
            {loading === 'reject' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading === 'approve' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Approve
          </button>
        </div>
      )}

      {/* Execute Button for Approved Actions */}
      {action.status === 'approved' && onExecute && (
        <div className="px-4 pb-4 flex gap-2 justify-end">
          <button
            onClick={handleExecute}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading === 'execute' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Execute Now
          </button>
        </div>
      )}
    </div>
  )
}
