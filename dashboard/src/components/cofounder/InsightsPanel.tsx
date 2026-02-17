'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Lightbulb,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
  Star,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  BarChart3,
  Activity,
  Zap,
  AlertCircle,
  X
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface Insight {
  id: string
  type: 'opportunity' | 'trend' | 'alert' | 'optimization' | 'benchmark'
  category: 'revenue' | 'customers' | 'operations' | 'marketing' | 'competitive'
  title: string
  summary: string
  details: string
  impact: 'high' | 'medium' | 'low'
  confidence: number // 0-100
  actionable: boolean
  suggestedAction?: string
  generatedAt: Date
  saved: boolean
  metrics?: {
    label: string
    value: string
    change?: number
  }[]
}

interface InsightsPanelProps {
  businessId: string
}

// Fetch insights from the backend API
async function fetchInsights(businessId: string): Promise<Insight[]> {
  try {
    // Get session for auth
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    const response = await fetch(`/api/cofounder/insights?businessId=${businessId}`, {
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
    })

    if (!response.ok) {
      throw new Error('Failed to fetch insights')
    }

    const data = await response.json()

    // Transform API opportunities to Insight format
    const insights: Insight[] = []

    // Add opportunities
    if (data.opportunities && Array.isArray(data.opportunities)) {
      data.opportunities.forEach((opp: {
        id?: string
        type?: string
        title: string
        description: string
        potentialRevenue?: number
        likelihood?: number
        suggestedAction?: string
      }, index: number) => {
        insights.push({
          id: opp.id || `opp-${index}`,
          type: 'opportunity',
          category: 'revenue',
          title: opp.title,
          summary: opp.description,
          details: opp.description,
          impact: opp.potentialRevenue && opp.potentialRevenue > 1000 ? 'high' : 'medium',
          confidence: opp.likelihood || 75,
          actionable: true,
          suggestedAction: opp.suggestedAction,
          generatedAt: new Date(),
          saved: false,
          metrics: opp.potentialRevenue ? [
            { label: 'Potential Revenue', value: `$${opp.potentialRevenue.toLocaleString()}` },
            { label: 'Likelihood', value: `${opp.likelihood || 75}%` }
          ] : undefined
        })
      })
    }

    // Add seasonal insights
    if (data.seasonalInsights && Array.isArray(data.seasonalInsights)) {
      data.seasonalInsights.forEach((seasonal: {
        id?: string
        insight: string
        recommendation?: string
      }, index: number) => {
        insights.push({
          id: seasonal.id || `seasonal-${index}`,
          type: 'trend',
          category: 'marketing',
          title: 'Seasonal Insight',
          summary: seasonal.insight,
          details: seasonal.insight,
          impact: 'medium',
          confidence: 85,
          actionable: !!seasonal.recommendation,
          suggestedAction: seasonal.recommendation,
          generatedAt: new Date(),
          saved: false
        })
      })
    }

    // Add goal progress as insights
    if (data.goalProgress && Array.isArray(data.goalProgress)) {
      data.goalProgress.forEach((goal: {
        id?: string
        name: string
        current: number
        target: number
        percentage: number
        status: string
      }, index: number) => {
        if (goal.status === 'behind') {
          insights.push({
            id: goal.id || `goal-${index}`,
            type: 'alert',
            category: 'operations',
            title: `Goal Behind: ${goal.name}`,
            summary: `Currently at ${goal.percentage}% of target (${goal.current}/${goal.target})`,
            details: `This goal is behind schedule. Consider adjusting strategy or timeline.`,
            impact: 'high',
            confidence: 100,
            actionable: true,
            suggestedAction: 'Review goal strategy and identify blockers',
            generatedAt: new Date(),
            saved: false,
            metrics: [
              { label: 'Current', value: goal.current.toString() },
              { label: 'Target', value: goal.target.toString() },
              { label: 'Progress', value: `${goal.percentage}%` }
            ]
          })
        }
      })
    }

    return insights
  } catch (error) {
    console.error('Error fetching insights:', error)
    return []
  }
}

// Fallback data for when API fails or Supabase not configured
const generateFallbackInsights = (): Insight[] => {
  const now = new Date()
  return [
    {
      id: '1',
      type: 'opportunity',
      category: 'revenue',
      title: 'Upsell window detected for customers',
      summary: 'Highly engaged customers may be ready for premium services.',
      details: 'Based on engagement patterns, some customers show high conversion likelihood.',
      impact: 'high',
      confidence: 87,
      actionable: true,
      suggestedAction: 'Send personalized upgrade offers',
      generatedAt: new Date(now.getTime() - 2 * 3600000),
      saved: false,
    },
    {
      id: '2',
      type: 'trend',
      category: 'customers',
      title: 'Response time impacts conversion',
      summary: 'Faster responses correlate with higher conversion rates.',
      details: 'Quick response times significantly improve lead conversion.',
      impact: 'high',
      confidence: 94,
      actionable: true,
      suggestedAction: 'Enable instant AI responses for leads',
      generatedAt: new Date(now.getTime() - 6 * 3600000),
      saved: false,
    },
    {
      id: '3',
      type: 'alert',
      category: 'operations',
      title: 'Invoice aging increasing',
      summary: 'Average payment time has increased recently.',
      details: 'Consider implementing earlier reminder sequences.',
      impact: 'medium',
      confidence: 100,
      actionable: true,
      suggestedAction: 'Enable automatic payment reminders',
      generatedAt: new Date(now.getTime() - 12 * 3600000),
      saved: false,
    }
  ]
}

const getTypeConfig = (type: Insight['type']) => {
  switch (type) {
    case 'opportunity':
      return { icon: TrendingUp, color: 'emerald', bg: 'bg-emerald-600/20', text: 'text-emerald-400', label: 'Opportunity' }
    case 'trend':
      return { icon: BarChart3, color: 'blue', bg: 'bg-blue-600/20', text: 'text-blue-400', label: 'Trend' }
    case 'alert':
      return { icon: AlertTriangle, color: 'amber', bg: 'bg-amber-600/20', text: 'text-amber-400', label: 'Alert' }
    case 'optimization':
      return { icon: Zap, color: 'purple', bg: 'bg-purple-600/20', text: 'text-purple-400', label: 'Optimization' }
    case 'benchmark':
      return { icon: Activity, color: 'cyan', bg: 'bg-cyan-600/20', text: 'text-cyan-400', label: 'Benchmark' }
  }
}

const getImpactBadge = (impact: Insight['impact']) => {
  switch (impact) {
    case 'high':
      return { bg: 'bg-red-600/20', text: 'text-red-400', label: 'High Impact' }
    case 'medium':
      return { bg: 'bg-amber-600/20', text: 'text-amber-400', label: 'Medium Impact' }
    case 'low':
      return { bg: 'bg-blue-600/20', text: 'text-blue-400', label: 'Low Impact' }
  }
}

const getCategoryConfig = (category: Insight['category']) => {
  switch (category) {
    case 'revenue':
      return { icon: DollarSign, label: 'Revenue' }
    case 'customers':
      return { icon: Users, label: 'Customers' }
    case 'operations':
      return { icon: Clock, label: 'Operations' }
    case 'marketing':
      return { icon: Target, label: 'Marketing' }
    case 'competitive':
      return { icon: Star, label: 'Competitive' }
  }
}

function InsightCard({
  insight,
  expanded,
  onToggle,
  onSave,
  onFeedback,
  index
}: {
  insight: Insight
  expanded: boolean
  onToggle: () => void
  onSave: () => void
  onFeedback: (helpful: boolean) => void
  index: number
}) {
  const typeConfig = getTypeConfig(insight.type)
  const impactBadge = getImpactBadge(insight.impact)
  const categoryConfig = getCategoryConfig(insight.category)
  const Icon = typeConfig.icon
  const CategoryIcon = categoryConfig.icon

  return (
    <div
      className={`group card-refined border backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300
        ${expanded
          ? 'border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.1)]'
          : 'border-ghost-border hover:border-ghost-border-subtle'}
        animate-fade-in-up`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className="p-4 cursor-pointer hover:bg-ghost-card/60 transition-all duration-200"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${typeConfig.bg}
            transition-all duration-300 group-hover:scale-105`}>
            <Icon className={`w-5 h-5 ${typeConfig.text} drop-shadow-sm`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h4 className="text-sm font-semibold text-white">{insight.title}</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${impactBadge.bg} ${impactBadge.text}
                ring-1 ring-current/20 uppercase tracking-wider`}>
                {impactBadge.label}
              </span>
            </div>
            <p className="text-sm text-ghost-muted line-clamp-2 leading-relaxed">{insight.summary}</p>
            <div className="flex items-center gap-3 mt-2.5">
              <div className="flex items-center gap-1.5 text-xs text-ghost-muted">
                <CategoryIcon className="w-3.5 h-3.5" />
                {categoryConfig.label}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ghost-muted">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500/60" />
                <span className="tabular-nums">{insight.confidence}%</span> confidence
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSave()
            }}
            className="p-2 hover:bg-ghost-border/50 rounded-lg transition-all duration-200 hover:scale-110"
          >
            {insight.saved ? (
              <BookmarkCheck className="w-5 h-5 text-emerald-400 drop-shadow-sm" />
            ) : (
              <Bookmark className="w-5 h-5 text-ghost-muted" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-ghost-border/50">
          <p className="text-sm text-ghost-text mt-4 leading-relaxed">{insight.details}</p>

          {insight.metrics && insight.metrics.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {insight.metrics.map((metric, i) => (
                <div key={i} className="bg-ghost-bg/50 rounded-lg px-3 py-2">
                  <div className="text-xs text-ghost-muted">{metric.label}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-white">{metric.value}</span>
                    {metric.change !== undefined && (
                      <span className={`text-xs ${metric.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {insight.actionable && insight.suggestedAction && (
            <div className="mt-4 p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-emerald-400 font-medium mb-1">Suggested Action</p>
                  <p className="text-sm text-ghost-text">{insight.suggestedAction}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-ghost-border/50">
            <div className="text-xs text-ghost-muted">
              Generated {insight.generatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at{' '}
              {insight.generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ghost-muted mr-2">Was this helpful?</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFeedback(true)
                }}
                className="p-1.5 hover:bg-emerald-600/20 rounded-lg transition-colors text-ghost-muted hover:text-emerald-400"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFeedback(false)
                }}
                className="p-1.5 hover:bg-red-600/20 rounded-lg transition-colors text-ghost-muted hover:text-red-400"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-ghost-border bg-ghost-card rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="w-3/4 h-4 mb-2" />
              <Skeleton className="w-full h-3 mb-2" />
              <Skeleton className="w-32 h-3" />
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
            {error || 'Unable to connect to backend. Displaying sample insights.'}
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

export default function InsightsPanel({ businessId }: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'saved' | Insight['type']>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  const [errorDismissed, setErrorDismissed] = useState(false)

  const loadInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIsUsingFallback(false)
    setErrorDismissed(false)
    try {
      // Fetch real data from backend if Supabase is configured
      if (isSupabaseConfigured) {
        const realInsights = await fetchInsights(businessId)
        if (realInsights.length > 0) {
          setInsights(realInsights)
          return
        }
      }
      // Fall back to demo data if API returns empty or Supabase not configured
      const fallbackData = generateFallbackInsights()
      setInsights(fallbackData)
      setIsUsingFallback(true)
    } catch (err) {
      console.error('Error loading insights:', err)
      setError('Failed to load insights. Showing demo data.')
      // Use fallback data on error
      setInsights(generateFallbackInsights())
      setIsUsingFallback(true)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadInsights()
    setRefreshing(false)
  }

  const handleSave = (id: string) => {
    setInsights(prev =>
      prev.map(insight =>
        insight.id === id ? { ...insight, saved: !insight.saved } : insight
      )
    )
  }

  const handleFeedback = (id: string, helpful: boolean) => {
    // In production, this would send feedback to the backend
    console.log(`Feedback for insight ${id}: ${helpful ? 'helpful' : 'not helpful'}`)
  }

  const filteredInsights = insights.filter(insight => {
    if (filter === 'all') return true
    if (filter === 'saved') return insight.saved
    return insight.type === filter
  })

  const filterOptions = [
    { value: 'all', label: 'All Insights' },
    { value: 'saved', label: 'Saved' },
    { value: 'opportunity', label: 'Opportunities' },
    { value: 'trend', label: 'Trends' },
    { value: 'alert', label: 'Alerts' },
    { value: 'optimization', label: 'Optimizations' },
    { value: 'benchmark', label: 'Benchmarks' },
  ] as const

  const insightCounts = {
    all: insights.length,
    saved: insights.filter(i => i.saved).length,
    opportunity: insights.filter(i => i.type === 'opportunity').length,
    trend: insights.filter(i => i.type === 'trend').length,
    alert: insights.filter(i => i.type === 'alert').length,
    optimization: insights.filter(i => i.type === 'optimization').length,
    benchmark: insights.filter(i => i.type === 'benchmark').length,
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <Skeleton className="w-48 h-6 mb-2" />
          <Skeleton className="w-64 h-4" />
        </div>
        <InsightsSkeleton />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-5 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-display font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-xl
              flex items-center justify-center ring-1 ring-amber-500/20">
              <Lightbulb className="w-5 h-5 text-amber-400 drop-shadow-sm" />
            </div>
            AI-Generated Insights
          </h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 hover:bg-ghost-card rounded-xl transition-all duration-200
              text-ghost-muted hover:text-white hover:scale-105 active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-ghost-muted">
          <span className="text-emerald-400 font-semibold tabular-nums">{insights.length}</span> insights based on your business data
        </p>
      </div>

      {/* Error/Fallback Banner */}
      {!errorDismissed && (
        <ErrorBanner
          error={error}
          isUsingFallback={isUsingFallback}
          onRetry={handleRefresh}
          onDismiss={() => setErrorDismissed(true)}
        />
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {filterOptions.map((option, index) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap
              transition-all duration-200 animate-fade-in-up ${
              filter === option.value
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'bg-ghost-card/60 text-ghost-muted hover:text-white border border-ghost-border/60 hover:border-ghost-border hover:bg-ghost-card'
            }`}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            {option.label}
            <span className={`text-xs tabular-nums px-1.5 py-0.5 rounded-full ${
              filter === option.value ? 'bg-emerald-500/20' : 'bg-ghost-border/50'
            }`}>
              {insightCounts[option.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Insights List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 bg-ghost-card/80 rounded-2xl flex items-center justify-center mb-4">
              <Lightbulb className="w-7 h-7 text-ghost-muted" />
            </div>
            <p className="text-ghost-muted font-medium">No insights in this category</p>
            <button
              onClick={() => setFilter('all')}
              className="mt-4 px-4 py-2 text-sm font-medium text-emerald-400 hover:text-emerald-300
                bg-emerald-500/10 hover:bg-emerald-500/15 rounded-lg transition-all duration-200"
            >
              View all insights
            </button>
          </div>
        ) : (
          filteredInsights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              expanded={expandedId === insight.id}
              onToggle={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
              onSave={() => handleSave(insight.id)}
              onFeedback={(helpful) => handleFeedback(insight.id, helpful)}
              index={index}
            />
          ))
        )}
      </div>
    </div>
  )
}
