'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Calendar,
  RefreshCw,
  ChevronRight,
  DollarSign,
  Users,
  Star,
  Clock,
  Loader2,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  OpportunityResult,
  SeasonalInsightResult
} from '@/lib/cofounder/intelligence'

interface InsightsFeedProps {
  businessId: string
  onActionClick?: (action: string, insightType: string) => void
}

type InsightType = 'opportunity' | 'warning' | 'tip' | 'seasonal'

interface DisplayInsight {
  id: string
  type: InsightType
  title: string
  description: string
  action?: string
  actionLabel?: string
  priority: 'low' | 'medium' | 'high'
  value?: number
  metadata?: Record<string, any>
}

const typeIcons: Record<InsightType, typeof Lightbulb> = {
  opportunity: TrendingUp,
  warning: AlertTriangle,
  tip: Lightbulb,
  seasonal: Calendar
}

const typeColors: Record<InsightType, { bg: string; border: string; icon: string }> = {
  opportunity: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400' },
  warning: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: 'text-orange-400' },
  tip: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400' },
  seasonal: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: 'text-purple-400' }
}

const priorityBadges: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

export default function InsightsFeed({ businessId, onActionClick }: InsightsFeedProps) {
  const [insights, setInsights] = useState<DisplayInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<InsightType | 'all'>('all')

  const transformInsights = useCallback((
    opportunities: OpportunityResult[],
    seasonal: SeasonalInsightResult
  ): DisplayInsight[] => {
    const displayInsights: DisplayInsight[] = []

    // Transform opportunities to insights
    opportunities.forEach((opp, index) => {
      const typeMap: Record<OpportunityResult['type'], InsightType> = {
        upsell: 'opportunity',
        referral: 'opportunity',
        retention: 'warning',
        growth: 'opportunity'
      }

      displayInsights.push({
        id: `opp-${index}`,
        type: typeMap[opp.type],
        title: opp.type === 'retention'
          ? `At-Risk: ${opp.contactName || 'Customer'}`
          : `${opp.type.charAt(0).toUpperCase() + opp.type.slice(1)} Opportunity`,
        description: opp.description,
        action: opp.suggestedAction,
        actionLabel: opp.type === 'retention' ? 'Re-engage' :
                     opp.type === 'upsell' ? 'Offer Upgrade' :
                     opp.type === 'referral' ? 'Request Review' : 'Take Action',
        priority: opp.priority,
        value: opp.potentialValue,
        metadata: {
          contactId: opp.contactId,
          contactName: opp.contactName,
          opportunityType: opp.type
        }
      })
    })

    // Transform upcoming events to insights
    seasonal.upcomingEvents.forEach((event, index) => {
      displayInsights.push({
        id: `event-${index}`,
        type: 'seasonal',
        title: event.name,
        description: `Coming up on ${new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        action: event.prepActions.join(' | '),
        actionLabel: 'Prepare',
        priority: new Date(event.date).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000 ? 'high' : 'medium'
      })
    })

    // Add tips from seasonal recommendations
    seasonal.recommendations?.forEach((rec, index) => {
      displayInsights.push({
        id: `tip-${index}`,
        type: 'tip',
        title: 'AI Recommendation',
        description: rec,
        priority: 'medium'
      })
    })

    // Add historical patterns as insights
    seasonal.historicalPatterns.forEach((pattern, index) => {
      displayInsights.push({
        id: `pattern-${index}`,
        type: 'tip',
        title: pattern.period,
        description: pattern.insight,
        priority: 'low'
      })
    })

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return displayInsights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }, [])

  const fetchInsights = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(
        `/api/cofounder/insights?businessId=${businessId}${forceRefresh ? '&refresh=true' : ''}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }

      const data = await response.json()

      const displayInsights = transformInsights(
        data.opportunities || [],
        data.seasonalInsights || { upcomingEvents: [], historicalPatterns: [], recommendations: [] }
      )

      setInsights(displayInsights)

      if (forceRefresh) {
        toast.success('Insights refreshed', {
          description: `Found ${displayInsights.length} actionable insights`
        })
      }
    } catch (err) {
      console.error('Error fetching insights:', err)
      setError('Failed to load insights')
      toast.error('Failed to load insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [businessId, transformInsights])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const handleAction = (insight: DisplayInsight) => {
    if (onActionClick && insight.action) {
      onActionClick(insight.action, insight.type)
    } else {
      // Default action - copy to clipboard
      navigator.clipboard.writeText(insight.action || insight.description)
      toast.success('Copied to clipboard', {
        description: 'Action suggestion copied'
      })
    }
  }

  const filteredInsights = filter === 'all'
    ? insights
    : insights.filter(i => i.type === filter)

  if (loading) {
    return (
      <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Insights</h2>
              <p className="text-xs text-ghost-muted">Loading recommendations...</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-ghost-border rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Unable to load insights</p>
          <p className="text-ghost-muted text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchInsights(true)}
            className="px-4 py-2 bg-ghost-accent text-white rounded-lg hover:bg-ghost-accent/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-ghost-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Insights</h2>
              <p className="text-xs text-ghost-muted">
                {insights.length} actionable recommendations
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            className="p-2 text-ghost-muted hover:text-white hover:bg-ghost-border rounded-lg transition-colors disabled:opacity-50"
            title="Refresh insights"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'opportunity', 'warning', 'tip', 'seasonal'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filter === type
                  ? 'bg-ghost-accent text-white'
                  : 'bg-ghost-border text-ghost-muted hover:text-white'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              {type !== 'all' && (
                <span className="ml-1 opacity-60">
                  ({insights.filter(i => i.type === type).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Insights List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredInsights.length === 0 ? (
          <div className="p-8 text-center">
            <Lightbulb className="w-12 h-12 text-ghost-muted mx-auto mb-4" />
            <p className="text-white font-medium mb-2">No insights yet</p>
            <p className="text-ghost-muted text-sm">
              Insights will appear as we analyze your business data
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ghost-border">
            {filteredInsights.map(insight => {
              const Icon = typeIcons[insight.type]
              const colors = typeColors[insight.type]

              return (
                <div
                  key={insight.id}
                  className={`p-4 hover:bg-ghost-border/30 transition-colors ${colors.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg} border ${colors.border}`}>
                      <Icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium truncate">{insight.title}</h3>
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-medium rounded border ${priorityBadges[insight.priority]}`}>
                          {insight.priority}
                        </span>
                      </div>
                      <p className="text-sm text-ghost-muted mb-3">{insight.description}</p>

                      {insight.value && (
                        <div className="flex items-center gap-1 mb-3 text-xs">
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">
                            ${insight.value.toLocaleString()} potential value
                          </span>
                        </div>
                      )}

                      {insight.action && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction(insight)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-ghost-accent/20 text-ghost-accent hover:bg-ghost-accent hover:text-white rounded-lg transition-colors"
                          >
                            {insight.actionLabel || 'Take Action'}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <span className="text-xs text-ghost-muted truncate">
                            {insight.action}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
