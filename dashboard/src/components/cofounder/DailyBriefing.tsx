'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sun,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  Circle,
  ArrowRight,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  Clock,
  Target,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Zap,
  AlertTriangle
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

// Icon mapping for API response
const iconMap: Record<string, React.ElementType> = {
  DollarSign,
  Users,
  MessageSquare,
  Clock,
  Calendar,
  Target,
  Zap
}

interface MetricComparison {
  label: string
  value: string | number
  previousValue?: string | number
  change?: number
  changeLabel?: string
  icon: React.ElementType
  color: string
}

interface Priority {
  id: string
  title: string
  description: string
  urgency: 'high' | 'medium' | 'low'
  completed: boolean
  actionLabel?: string
  estimatedImpact?: string
}

interface DailyBriefingData {
  greeting: string
  summary: string
  metrics: MetricComparison[]
  priorities: Priority[]
  opportunities: string[]
  scheduledToday: number
  generatedAt: Date
}

// API response type (icon is a string)
interface ApiBriefingMetric {
  label: string
  value: string | number
  previousValue?: string | number
  change?: number
  changeLabel?: string
  icon: string
  color: string
}

interface ApiBriefingResponse {
  greeting: string
  summary: string
  metrics: ApiBriefingMetric[]
  priorities: Priority[]
  opportunities: string[]
  scheduledToday: number
  generatedAt: string
  isRealtime?: boolean
}

interface DailyBriefingProps {
  businessId: string
  onPriorityAction?: (priorityId: string) => void
}

// Demo data generator - used as fallback when API fails
const generateDemoData = (): DailyBriefingData => {
  const now = new Date()
  const hour = now.getHours()
  let greeting = 'Good morning'
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon'
  if (hour >= 17) greeting = 'Good evening'

  return {
    greeting,
    summary: "Demo mode: Your business had a strong start to the week. Revenue is tracking 18% above last week, and lead quality has improved significantly. Focus today on the follow-ups below to maintain momentum.",
    metrics: [
      {
        label: 'Revenue Today',
        value: '$1,245',
        previousValue: '$980',
        change: 27,
        changeLabel: 'vs yesterday',
        icon: DollarSign,
        color: 'emerald'
      },
      {
        label: 'New Leads',
        value: 8,
        previousValue: 5,
        change: 60,
        changeLabel: 'vs yesterday',
        icon: Users,
        color: 'blue'
      },
      {
        label: 'Response Time',
        value: '47s',
        previousValue: '62s',
        change: -24,
        changeLabel: 'improvement',
        icon: Clock,
        color: 'purple'
      },
      {
        label: 'Messages',
        value: 34,
        previousValue: 28,
        change: 21,
        changeLabel: 'vs yesterday',
        icon: MessageSquare,
        color: 'amber'
      }
    ],
    priorities: [
      {
        id: '1',
        title: 'Follow up with Sarah Mitchell',
        description: 'High-value lead ($5,000+) requested quote 2 days ago. No response to our follow-up.',
        urgency: 'high',
        completed: false,
        actionLabel: 'Send personal message',
        estimatedImpact: '+$5,000 potential'
      },
      {
        id: '2',
        title: 'Invoice reminder for Johnson Co.',
        description: '$2,450 invoice is 5 days overdue. Payment link was clicked but not completed.',
        urgency: 'high',
        completed: false,
        actionLabel: 'Send reminder',
        estimatedImpact: 'Recover $2,450'
      },
      {
        id: '3',
        title: 'Review website form submissions',
        description: '3 new inquiries overnight need qualification and response.',
        urgency: 'medium',
        completed: false,
        actionLabel: 'View leads',
        estimatedImpact: '3 new opportunities'
      }
    ],
    opportunities: [
      'Weekend promotion could boost sales 15-20%',
      '2 customers have anniversary dates this week - send appreciation offers',
      'Competitor price increase detected - highlight your value'
    ],
    scheduledToday: 4,
    generatedAt: new Date()
  }
}

/**
 * Transform API response to component data format
 */
function transformApiResponse(response: ApiBriefingResponse): DailyBriefingData {
  return {
    greeting: response.greeting,
    summary: response.summary,
    metrics: response.metrics.map(metric => ({
      ...metric,
      icon: iconMap[metric.icon] || DollarSign
    })),
    priorities: response.priorities,
    opportunities: response.opportunities,
    scheduledToday: response.scheduledToday,
    generatedAt: new Date(response.generatedAt)
  }
}

const getUrgencyColor = (urgency: Priority['urgency']) => {
  switch (urgency) {
    case 'high':
      return { bg: 'bg-red-600/20', text: 'text-red-400', border: 'border-red-500/30' }
    case 'medium':
      return { bg: 'bg-amber-600/20', text: 'text-amber-400', border: 'border-amber-500/30' }
    case 'low':
      return { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-500/30' }
  }
}

const getMetricColor = (color: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-600/20', text: 'text-emerald-400' },
    blue: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
    purple: { bg: 'bg-purple-600/20', text: 'text-purple-400' },
    amber: { bg: 'bg-amber-600/20', text: 'text-amber-400' },
    red: { bg: 'bg-red-600/20', text: 'text-red-400' }
  }
  return colors[color] || colors.blue
}

function MetricCard({ metric, index }: { metric: MetricComparison; index: number }) {
  const Icon = metric.icon
  const colors = getMetricColor(metric.color)
  const isPositive = (metric.change || 0) > 0
  const isNegative = (metric.change || 0) < 0
  // For response time, negative change is good
  const isGood = metric.label.includes('Time') ? isNegative : isPositive

  return (
    <div
      className="group card-refined card-interactive bg-ghost-card/90 backdrop-blur-sm border border-ghost-border rounded-xl p-4
        animate-fade-in-up"
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.bg}
          transition-all duration-300 group-hover:scale-110`}>
          <Icon className={`w-4 h-4 ${colors.text} drop-shadow-sm`} />
        </div>
        {metric.change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
            transition-transform duration-300 group-hover:scale-105
            ${isGood
              ? 'text-emerald-400 bg-emerald-500/15'
              : isNegative
                ? 'text-red-400 bg-red-500/15'
                : 'text-ghost-muted bg-ghost-border/50'}`}>
            {isGood ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span className="tabular-nums">{Math.abs(metric.change)}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-display font-bold text-white tabular-nums">{metric.value}</div>
      <div className="text-xs font-medium text-ghost-text mt-1">{metric.label}</div>
      {metric.changeLabel && (
        <div className="text-[10px] text-ghost-muted mt-0.5">{metric.changeLabel}</div>
      )}
    </div>
  )
}

function PriorityItem({
  priority,
  onAction,
  index
}: {
  priority: Priority
  onAction?: () => void
  index: number
}) {
  const urgencyColors = getUrgencyColor(priority.urgency)

  return (
    <div
      className={`group p-4 rounded-xl border backdrop-blur-sm transition-all duration-300
        ${priority.completed
          ? 'border-ghost-border/50 bg-ghost-card/30 opacity-60'
          : `${urgencyColors.border} bg-ghost-card/60 hover:bg-ghost-card/80 hover:border-opacity-50
             hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]`}
        animate-list-item`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        <button className={`mt-0.5 flex-shrink-0 transition-transform duration-200 ${!priority.completed && 'group-hover:scale-110'}`}>
          {priority.completed ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <Circle className={`w-5 h-5 ${urgencyColors.text}`} />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-semibold ${priority.completed ? 'text-ghost-muted line-through' : 'text-white'}`}>
              {priority.title}
            </h4>
            {!priority.completed && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyColors.bg} ${urgencyColors.text}
                uppercase tracking-wider flex-shrink-0 ring-1 ${urgencyColors.border}`}>
                {priority.urgency}
              </span>
            )}
          </div>
          <p className={`text-xs mt-1.5 leading-relaxed ${priority.completed ? 'text-ghost-muted/50' : 'text-ghost-muted'}`}>
            {priority.description}
          </p>
          {!priority.completed && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-ghost-border/30">
              {priority.estimatedImpact && (
                <span className="text-xs font-medium text-emerald-400/90 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {priority.estimatedImpact}
                </span>
              )}
              {priority.actionLabel && (
                <button
                  onClick={onAction}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300
                    transition-all duration-200 group/btn"
                >
                  {priority.actionLabel}
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BriefingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="w-48 h-8 mb-2" />
        <Skeleton className="w-full h-16" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-ghost-card border border-ghost-border rounded-xl p-4">
            <Skeleton className="w-8 h-8 rounded-lg mb-2" />
            <Skeleton className="w-16 h-6 mb-1" />
            <Skeleton className="w-20 h-3" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="w-32 h-5" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="w-full h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function DailyBriefing({ businessId, onPriorityAction }: DailyBriefingProps) {
  const [briefing, setBriefing] = useState<DailyBriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  const loadBriefing = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await fetch(`/api/cofounder/briefing?businessId=${encodeURIComponent(businessId)}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // If no briefing found (404), fall back to demo data
        if (response.status === 404 || errorData.code === 'NOT_FOUND') {
          console.log('No briefing available, using demo data')
          const demoData = generateDemoData()
          setBriefing(demoData)
          setIsDemo(true)
          return
        }

        throw new Error(errorData.error || `Failed to fetch briefing: ${response.status}`)
      }

      const data: ApiBriefingResponse = await response.json()
      const transformedData = transformApiResponse(data)
      setBriefing(transformedData)
      setIsDemo(false)

    } catch (err) {
      console.error('Error loading briefing:', err)
      setError(err instanceof Error ? err.message : 'Failed to load briefing')

      // Fall back to demo data on error
      const demoData = generateDemoData()
      setBriefing(demoData)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadBriefing()
  }, [loadBriefing])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadBriefing(true)
    setRefreshing(false)
  }

  const handlePriorityAction = (priorityId: string) => {
    if (onPriorityAction) {
      onPriorityAction(priorityId)
    }
  }

  if (loading) {
    return <BriefingSkeleton />
  }

  if (!briefing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-ghost-card rounded-full flex items-center justify-center mb-4">
          <Sun className="w-8 h-8 text-ghost-muted" />
        </div>
        <p className="text-ghost-muted">Unable to load briefing</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const completedCount = briefing.priorities.filter(p => p.completed).length
  const totalPriorities = briefing.priorities.length

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-600/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            Showing demo data. Real briefings will appear once your business data is available.
          </p>
        </div>
      )}

      {/* Error Banner (if error occurred but we're showing demo data) */}
      {error && isDemo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-600/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">
            Could not load briefing: {error}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500/25 to-orange-600/20 rounded-xl
            flex items-center justify-center ring-1 ring-amber-500/20 icon-glow">
            <Sun className="w-6 h-6 text-amber-400 drop-shadow-sm" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-display font-bold text-white text-headline">{briefing.greeting}</h2>
              {isDemo && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-600/20 text-amber-400 rounded-full
                  uppercase tracking-wider ring-1 ring-amber-500/30">
                  Demo
                </span>
              )}
            </div>
            <p className="text-sm text-ghost-muted mt-0.5">
              Updated {briefing.generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 hover:bg-ghost-card rounded-xl transition-all duration-200
            text-ghost-muted hover:text-white hover:scale-105 active:scale-95"
          title="Refresh briefing"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary */}
      <div className="p-5 bg-gradient-to-br from-emerald-600/12 to-teal-600/8 border border-emerald-500/20
        rounded-2xl card-refined animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm text-ghost-text leading-relaxed">{briefing.summary}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div>
        <h3 className="text-sm font-semibold text-ghost-text mb-4 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Today's Snapshot
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {briefing.metrics.map((metric, i) => (
            <MetricCard key={i} metric={metric} index={i} />
          ))}
        </div>
      </div>

      {/* Priorities */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ghost-text uppercase tracking-wider flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Today's Priorities
          </h3>
          <span className="text-xs font-medium text-ghost-muted px-2 py-1 bg-ghost-card rounded-full">
            <span className="text-emerald-400">{completedCount}</span>/{totalPriorities} done
          </span>
        </div>
        <div className="space-y-3">
          {briefing.priorities.map((priority, index) => (
            <PriorityItem
              key={priority.id}
              priority={priority}
              onAction={() => handlePriorityAction(priority.id)}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Opportunities */}
      {briefing.opportunities.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ghost-text mb-4 uppercase tracking-wider flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Zap className="w-3 h-3 text-amber-400" />
            </div>
            Opportunities
          </h3>
          <div className="space-y-2">
            {briefing.opportunities.map((opp, i) => (
              <div
                key={i}
                className="group flex items-start gap-3 p-3.5 bg-amber-600/8 border border-amber-500/15 rounded-xl
                  hover:bg-amber-600/12 hover:border-amber-500/25 transition-all duration-200
                  animate-list-item"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="w-2 h-2 bg-amber-400 rounded-full mt-1.5 flex-shrink-0
                  group-hover:scale-125 transition-transform duration-200" />
                <p className="text-sm text-ghost-text leading-relaxed">{opp}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Today */}
      <div className="flex items-center justify-between p-4 bg-ghost-card/80 border border-ghost-border rounded-xl
        card-interactive group">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-purple-600/20 rounded-xl flex items-center justify-center
            transition-all duration-300 group-hover:scale-110 group-hover:bg-purple-600/25">
            <Calendar className="w-5 h-5 text-purple-400 drop-shadow-sm" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              <span className="text-purple-400 tabular-nums">{briefing.scheduledToday}</span> appointments today
            </p>
            <p className="text-xs text-ghost-muted">View your calendar for details</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-400
          hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 rounded-lg
          transition-all duration-200 group/btn">
          View
          <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
