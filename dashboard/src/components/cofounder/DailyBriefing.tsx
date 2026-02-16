'use client'

import { useState, useEffect } from 'react'
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

interface DailyBriefingProps {
  businessId: string
  onPriorityAction?: (priorityId: string) => void
}

// Mock data generator - in production this would come from AI analysis
const generateBriefingData = (): DailyBriefingData => {
  const now = new Date()
  const hour = now.getHours()
  let greeting = 'Good morning'
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon'
  if (hour >= 17) greeting = 'Good evening'

  return {
    greeting,
    summary: "Your business had a strong start to the week. Revenue is tracking 18% above last week, and lead quality has improved significantly. Focus today on the 3 follow-ups below to maintain momentum.",
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
      },
      {
        id: '4',
        title: 'Confirm tomorrow\'s appointments',
        description: '4 appointments scheduled. Send confirmation reminders to reduce no-shows.',
        urgency: 'low',
        completed: true,
        actionLabel: 'Send confirmations'
      },
      {
        id: '5',
        title: 'Post social content',
        description: 'Scheduled post ready for review and publishing.',
        urgency: 'low',
        completed: false,
        actionLabel: 'Review post'
      }
    ],
    opportunities: [
      'Presidents Day weekend promotion could boost sales 15-20%',
      '2 customers have anniversary dates this week - send appreciation offers',
      'Competitor price increase detected - highlight your value'
    ],
    scheduledToday: 4,
    generatedAt: new Date()
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

function MetricCard({ metric }: { metric: MetricComparison }) {
  const Icon = metric.icon
  const colors = getMetricColor(metric.color)
  const isPositive = (metric.change || 0) > 0
  const isNegative = (metric.change || 0) < 0
  // For response time, negative change is good
  const isGood = metric.label.includes('Time') ? isNegative : isPositive

  return (
    <div className="bg-ghost-card border border-ghost-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        {metric.change !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${isGood ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-ghost-muted'}`}>
            {isGood ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(metric.change)}%
          </div>
        )}
      </div>
      <div className="text-xl font-bold text-white">{metric.value}</div>
      <div className="text-xs text-ghost-muted">{metric.label}</div>
      {metric.changeLabel && (
        <div className="text-[10px] text-ghost-muted mt-1">{metric.changeLabel}</div>
      )}
    </div>
  )
}

function PriorityItem({
  priority,
  onAction
}: {
  priority: Priority
  onAction?: () => void
}) {
  const urgencyColors = getUrgencyColor(priority.urgency)

  return (
    <div className={`p-4 rounded-xl border ${priority.completed ? 'border-ghost-border bg-ghost-card/30' : urgencyColors.border + ' bg-ghost-card/50'}`}>
      <div className="flex items-start gap-3">
        <button className="mt-0.5 flex-shrink-0">
          {priority.completed ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <Circle className={`w-5 h-5 ${urgencyColors.text}`} />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-medium ${priority.completed ? 'text-ghost-muted line-through' : 'text-white'}`}>
              {priority.title}
            </h4>
            {!priority.completed && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${urgencyColors.bg} ${urgencyColors.text} uppercase tracking-wide flex-shrink-0`}>
                {priority.urgency}
              </span>
            )}
          </div>
          <p className={`text-xs mt-1 ${priority.completed ? 'text-ghost-muted/60' : 'text-ghost-muted'}`}>
            {priority.description}
          </p>
          {!priority.completed && (
            <div className="flex items-center justify-between mt-3">
              {priority.estimatedImpact && (
                <span className="text-xs text-emerald-400/80">{priority.estimatedImpact}</span>
              )}
              {priority.actionLabel && (
                <button
                  onClick={onAction}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {priority.actionLabel}
                  <ChevronRight className="w-3 h-3" />
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

  useEffect(() => {
    loadBriefing()
  }, [businessId])

  const loadBriefing = async () => {
    setLoading(true)
    try {
      // Simulate API call - in production this would fetch AI-generated briefing
      await new Promise(resolve => setTimeout(resolve, 1000))
      const data = generateBriefingData()
      setBriefing(data)
    } catch (error) {
      console.error('Error loading briefing:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadBriefing()
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-xl flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{briefing.greeting}</h2>
              <p className="text-xs text-ghost-muted">
                Updated {briefing.generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-ghost-card rounded-lg transition-colors text-ghost-muted hover:text-white"
          title="Refresh briefing"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary */}
      <div className="p-4 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-ghost-text leading-relaxed">{briefing.summary}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div>
        <h3 className="text-sm font-medium text-ghost-muted mb-3 uppercase tracking-wide">Today's Snapshot</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {briefing.metrics.map((metric, i) => (
            <MetricCard key={i} metric={metric} />
          ))}
        </div>
      </div>

      {/* Priorities */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-ghost-muted uppercase tracking-wide">Today's Priorities</h3>
          <span className="text-xs text-ghost-muted">
            {completedCount}/{totalPriorities} done
          </span>
        </div>
        <div className="space-y-3">
          {briefing.priorities.map(priority => (
            <PriorityItem
              key={priority.id}
              priority={priority}
              onAction={() => handlePriorityAction(priority.id)}
            />
          ))}
        </div>
      </div>

      {/* Opportunities */}
      {briefing.opportunities.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ghost-muted mb-3 uppercase tracking-wide flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Opportunities
          </h3>
          <div className="space-y-2">
            {briefing.opportunities.map((opp, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-amber-600/10 border border-amber-500/20 rounded-lg">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-ghost-text">{opp}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Today */}
      <div className="flex items-center justify-between p-4 bg-ghost-card border border-ghost-border rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{briefing.scheduledToday} appointments today</p>
            <p className="text-xs text-ghost-muted">View your calendar for details</p>
          </div>
        </div>
        <button className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
          View
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
