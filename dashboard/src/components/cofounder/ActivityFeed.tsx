'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  Send,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  X
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface ActivityItem {
  id: string
  type: 'action' | 'insight' | 'decision' | 'opportunity' | 'alert'
  title: string
  description: string
  timestamp: Date
  status: 'completed' | 'pending' | 'in_progress'
  details?: string
  priority?: 'high' | 'medium' | 'low'
  actionButton?: {
    label: string
    onClick: () => void
  }
}

interface ActivityFeedProps {
  businessId: string
  limit?: number
  showHeader?: boolean
  compact?: boolean
}

// Map API action types to ActivityItem types
const mapActionType = (apiType: string): ActivityItem['type'] => {
  const typeMap: Record<string, ActivityItem['type']> = {
    payment_reminder: 'action',
    lead_response: 'action',
    review_reply: 'action',
    social_post: 'action',
    appointment_reminder: 'action',
    follow_up: 'action',
    alert: 'alert',
    opportunity: 'opportunity',
    insight: 'insight',
    decision: 'decision',
  }
  return typeMap[apiType] || 'action'
}

// Map API status to ActivityItem status
const mapStatus = (apiStatus: string): ActivityItem['status'] => {
  const statusMap: Record<string, ActivityItem['status']> = {
    pending: 'pending',
    approved: 'in_progress',
    executed: 'completed',
    rejected: 'completed',
  }
  return statusMap[apiStatus] || 'pending'
}

// Fetch activities from the backend API
async function fetchActivities(businessId: string): Promise<ActivityItem[]> {
  try {
    // Get session for auth
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    const response = await fetch(`/api/cofounder/actions?businessId=${businessId}&includeStats=false&limit=20`, {
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
    })

    if (!response.ok) {
      throw new Error('Failed to fetch activities')
    }

    const data = await response.json()
    const actions = data.actions || []

    // Transform API response to ActivityItem format
    return actions.map((action: {
      id: string
      type: string
      title: string
      description?: string
      status: string
      priority?: string
      content?: string
      metadata?: Record<string, unknown>
      created_at: string
    }) => ({
      id: action.id,
      type: mapActionType(action.type),
      title: action.title,
      description: action.description || action.content || '',
      timestamp: new Date(action.created_at),
      status: mapStatus(action.status),
      priority: action.priority,
      details: action.content || (action.metadata ? JSON.stringify(action.metadata) : undefined),
      actionButton: action.status === 'pending' ? {
        label: 'Review',
        onClick: () => window.location.href = `/cofounder?action=${action.id}`
      } : undefined
    }))
  } catch (error) {
    console.error('Error fetching activities:', error)
    return []
  }
}

// Fallback mock data for when API fails or Supabase not configured
const generateFallbackActivities = (): ActivityItem[] => {
  const now = new Date()
  return [
    {
      id: '1',
      type: 'action',
      title: 'Payment reminder sent to John Davis',
      description: 'Invoice #1087 overdue by 7 days - $2,450.00',
      timestamp: new Date(now.getTime() - 15 * 60000),
      status: 'completed',
      details: 'Sent personalized SMS reminder with payment link.'
    },
    {
      id: '2',
      type: 'opportunity',
      title: '3 customers ready for upsell',
      description: 'High engagement detected - perfect timing for premium offer',
      timestamp: new Date(now.getTime() - 45 * 60000),
      status: 'pending',
    },
    {
      id: '3',
      type: 'insight',
      title: 'Revenue trend analysis ready',
      description: 'Monthly revenue up 23% - see what drove growth',
      timestamp: new Date(now.getTime() - 2 * 3600000),
      status: 'completed',
    }
  ]
}

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'action':
      return Send
    case 'insight':
      return Lightbulb
    case 'decision':
      return CheckCircle
    case 'opportunity':
      return TrendingUp
    case 'alert':
      return AlertCircle
    default:
      return Bell
  }
}

const getActivityColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'action':
      return { bg: 'bg-emerald-600/20', text: 'text-emerald-400', border: 'border-emerald-500/30' }
    case 'insight':
      return { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-500/30' }
    case 'decision':
      return { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-500/30' }
    case 'opportunity':
      return { bg: 'bg-amber-600/20', text: 'text-amber-400', border: 'border-amber-500/30' }
    case 'alert':
      return { bg: 'bg-red-600/20', text: 'text-red-400', border: 'border-red-500/30' }
    default:
      return { bg: 'bg-ghost-border', text: 'text-ghost-muted', border: 'border-ghost-border' }
  }
}

const getStatusBadge = (status: ActivityItem['status']) => {
  switch (status) {
    case 'completed':
      return { bg: 'bg-emerald-600/20', text: 'text-emerald-400', label: 'Completed' }
    case 'pending':
      return { bg: 'bg-amber-600/20', text: 'text-amber-400', label: 'Pending' }
    case 'in_progress':
      return { bg: 'bg-blue-600/20', text: 'text-blue-400', label: 'In Progress' }
    default:
      return { bg: 'bg-ghost-border', text: 'text-ghost-muted', label: status }
  }
}

const formatTimestamp = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ActivityItemCard({
  item,
  compact = false
}: {
  item: ActivityItem
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = getActivityIcon(item.type)
  const colors = getActivityColor(item.type)
  const statusBadge = getStatusBadge(item.status)

  if (compact) {
    return (
      <div className="flex items-start gap-3 py-3 px-3 hover:bg-ghost-card/50 rounded-lg transition-colors">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{item.title}</p>
          <p className="text-xs text-ghost-muted">{formatTimestamp(item.timestamp)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`border ${colors.border} bg-ghost-card/50 rounded-xl overflow-hidden transition-all`}>
      <div
        className="p-4 cursor-pointer hover:bg-ghost-card/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="text-sm font-medium text-white">{item.title}</h4>
              <span className="text-xs text-ghost-muted flex-shrink-0">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
            <p className="text-sm text-ghost-muted mb-2">{item.description}</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
              {item.details && (
                <button className="text-xs text-ghost-muted hover:text-white flex items-center gap-1">
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expanded ? 'Less' : 'More'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {expanded && item.details && (
        <div className="px-4 pb-4 border-t border-ghost-border/50">
          <p className="text-sm text-ghost-text mt-3">{item.details}</p>
          {item.actionButton && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                item.actionButton?.onClick()
              }}
              className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
            >
              {item.actionButton.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ActivityFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="border border-ghost-border bg-ghost-card/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="w-3/4 h-4 mb-2" />
              <Skeleton className="w-full h-3 mb-2" />
              <Skeleton className="w-16 h-5 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorBanner({
  error,
  isUsingFallback,
  onRetry,
  onDismiss
}: {
  error: string | null
  isUsingFallback: boolean
  onRetry: () => void
  onDismiss: () => void
}) {
  if (!error && !isUsingFallback) return null

  const isError = !!error
  const bgColor = isError ? 'bg-red-500/10' : 'bg-amber-500/10'
  const borderColor = isError ? 'border-red-500/30' : 'border-amber-500/30'
  const textColor = isError ? 'text-red-400' : 'text-amber-400'
  const Icon = isError ? AlertCircle : AlertTriangle

  return (
    <div className={`mb-4 p-3 rounded-lg border ${bgColor} ${borderColor}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${textColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${textColor}`}>
            {isError ? 'Error Loading Data' : 'Showing Demo Data'}
          </p>
          <p className="text-xs text-ghost-muted mt-0.5">
            {error || 'Unable to connect to backend. Displaying sample activities.'}
          </p>
          <button
            onClick={onRetry}
            className={`mt-2 text-xs font-medium ${textColor} hover:underline`}
          >
            Try again
          </button>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-ghost-card rounded transition-colors text-ghost-muted hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function ActivityFeed({
  businessId,
  limit = 10,
  showHeader = true,
  compact = false
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'action' | 'insight' | 'opportunity' | 'alert'>('all')
  const [error, setError] = useState<string | null>(null)
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  const [errorDismissed, setErrorDismissed] = useState(false)

  const loadActivities = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIsUsingFallback(false)
    setErrorDismissed(false)
    try {
      // Fetch real data from backend if Supabase is configured
      if (isSupabaseConfigured) {
        const realActivities = await fetchActivities(businessId)
        if (realActivities.length > 0) {
          setActivities(realActivities)
          return
        }
      }
      // Fall back to demo data if API returns empty or Supabase not configured
      const fallbackData = generateFallbackActivities()
      setActivities(fallbackData)
      setIsUsingFallback(true)
    } catch (err) {
      console.error('Error loading activities:', err)
      setError('Failed to load activities. Showing demo data.')
      // Use fallback data on error
      setActivities(generateFallbackActivities())
      setIsUsingFallback(true)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadActivities()
    setRefreshing(false)
  }

  const filteredActivities = activities
    .filter(a => filter === 'all' || a.type === filter)
    .slice(0, limit)

  const filterOptions = [
    { value: 'all', label: 'All', icon: Bell },
    { value: 'action', label: 'Actions', icon: Send },
    { value: 'insight', label: 'Insights', icon: Lightbulb },
    { value: 'opportunity', label: 'Opportunities', icon: TrendingUp },
    { value: 'alert', label: 'Alerts', icon: AlertCircle },
  ] as const

  if (loading) {
    return (
      <div className="h-full">
        {showHeader && (
          <div className="mb-4">
            <Skeleton className="w-32 h-6 mb-2" />
            <Skeleton className="w-48 h-4" />
          </div>
        )}
        <ActivityFeedSkeleton count={compact ? 5 : 3} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {showHeader && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-ghost-card rounded-lg transition-colors text-ghost-muted hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-sm text-ghost-muted">Real-time actions and decisions by your AI Co-Founder</p>
        </div>
      )}

      {!errorDismissed && (
        <ErrorBanner
          error={error}
          isUsingFallback={isUsingFallback}
          onRetry={handleRefresh}
          onDismiss={() => setErrorDismissed(true)}
        />
      )}

      {!compact && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
          {filterOptions.map(option => {
            const Icon = option.icon
            const isActive = filter === option.value
            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-ghost-card text-ghost-muted hover:text-white border border-ghost-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {option.label}
              </button>
            )
          })}
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${compact ? 'space-y-1' : 'space-y-3'}`}>
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-ghost-card rounded-full flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-ghost-muted" />
            </div>
            <p className="text-ghost-muted">No activities yet</p>
            <p className="text-xs text-ghost-muted mt-1">Your Co-Founder will show activity here</p>
          </div>
        ) : (
          filteredActivities.map((item, index) => (
            <div
              key={item.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index * 75, 400)}ms` }}
            >
              <ActivityItemCard item={item} compact={compact} />
            </div>
          ))
        )}
      </div>

      {!compact && filteredActivities.length > 0 && (
        <div className="pt-4 mt-4 border-t border-ghost-border">
          <button className="w-full py-2 text-sm text-ghost-muted hover:text-white transition-colors">
            View all activity
          </button>
        </div>
      )}
    </div>
  )
}
