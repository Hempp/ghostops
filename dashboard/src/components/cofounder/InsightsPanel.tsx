'use client'

import { useState, useEffect } from 'react'
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
  Star,
  ChevronRight,
  RefreshCw,
  Filter,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  BarChart3,
  PieChart,
  Activity,
  Zap
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

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

// Mock data generator
const generateInsights = (): Insight[] => {
  const now = new Date()
  return [
    {
      id: '1',
      type: 'opportunity',
      category: 'revenue',
      title: 'Upsell window detected for 8 customers',
      summary: '8 customers have been highly engaged for 3+ months and have never purchased premium services.',
      details: 'Based on purchase history and engagement patterns, these customers have a 73% likelihood of converting to premium if approached with a personalized offer. Combined potential revenue: $4,200.',
      impact: 'high',
      confidence: 87,
      actionable: true,
      suggestedAction: 'Send personalized upgrade offers with 15% first-month discount',
      generatedAt: new Date(now.getTime() - 2 * 3600000),
      saved: false,
      metrics: [
        { label: 'Potential Revenue', value: '$4,200' },
        { label: 'Conversion Likelihood', value: '73%', change: 12 }
      ]
    },
    {
      id: '2',
      type: 'trend',
      category: 'customers',
      title: 'Response time correlates with conversion',
      summary: 'Leads contacted within 5 minutes have 3x higher conversion rate.',
      details: 'Analysis of your last 200 leads shows a clear correlation: responses under 5 minutes have 45% conversion, 5-30 minutes have 22% conversion, and over 30 minutes have only 15% conversion.',
      impact: 'high',
      confidence: 94,
      actionable: true,
      suggestedAction: 'Enable instant AI responses for all new leads during business hours',
      generatedAt: new Date(now.getTime() - 6 * 3600000),
      saved: true,
      metrics: [
        { label: '< 5 min conversion', value: '45%' },
        { label: '5-30 min conversion', value: '22%' },
        { label: '> 30 min conversion', value: '15%' }
      ]
    },
    {
      id: '3',
      type: 'alert',
      category: 'operations',
      title: 'Invoice aging increasing',
      summary: 'Average days to payment has increased from 12 to 18 days over the past month.',
      details: 'This 50% increase in payment time is impacting cash flow. Three specific customers account for 60% of the delay. Consider implementing earlier reminder sequences or offering early payment incentives.',
      impact: 'medium',
      confidence: 100,
      actionable: true,
      suggestedAction: 'Enable automatic payment reminders at 7, 14, and 21 days',
      generatedAt: new Date(now.getTime() - 12 * 3600000),
      saved: false,
      metrics: [
        { label: 'Current Avg', value: '18 days', change: -50 },
        { label: 'Outstanding', value: '$8,450' }
      ]
    },
    {
      id: '4',
      type: 'optimization',
      category: 'marketing',
      title: 'Best performing content identified',
      summary: 'Educational content generates 4x more engagement than promotional content.',
      details: 'Posts about tips, how-tos, and industry insights receive significantly more engagement than service promotions. Consider shifting content mix to 70% educational, 30% promotional.',
      impact: 'medium',
      confidence: 91,
      actionable: true,
      suggestedAction: 'Create content calendar with 70/30 educational to promotional ratio',
      generatedAt: new Date(now.getTime() - 24 * 3600000),
      saved: false,
      metrics: [
        { label: 'Educational Engagement', value: '+340%' },
        { label: 'Best Post Type', value: 'How-to guides' }
      ]
    },
    {
      id: '5',
      type: 'benchmark',
      category: 'competitive',
      title: 'Your pricing is 15% below market average',
      summary: 'Industry analysis shows competitors charge 15-20% more for similar services.',
      details: 'Based on analysis of 12 competitors in your area, your pricing is below market. Given your 4.8-star average review rating, there\'s room to increase prices without impacting demand.',
      impact: 'high',
      confidence: 78,
      actionable: true,
      suggestedAction: 'Test 10% price increase on new customers for one month',
      generatedAt: new Date(now.getTime() - 48 * 3600000),
      saved: true,
      metrics: [
        { label: 'Your Price', value: '$85/hr' },
        { label: 'Market Average', value: '$100/hr' },
        { label: 'Your Rating', value: '4.8 stars' }
      ]
    },
    {
      id: '6',
      type: 'trend',
      category: 'customers',
      title: 'Peak inquiry hours identified',
      summary: 'Most inquiries come between 6-8 PM, but response is slower during these hours.',
      details: '42% of all inquiries arrive between 6-8 PM, but your average response time during this window is 3x longer than during business hours. This is a key conversion opportunity.',
      impact: 'medium',
      confidence: 96,
      actionable: true,
      suggestedAction: 'Enable AI auto-response for evening inquiries with next-day callback promise',
      generatedAt: new Date(now.getTime() - 72 * 3600000),
      saved: false
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
  onFeedback
}: {
  insight: Insight
  expanded: boolean
  onToggle: () => void
  onSave: () => void
  onFeedback: (helpful: boolean) => void
}) {
  const typeConfig = getTypeConfig(insight.type)
  const impactBadge = getImpactBadge(insight.impact)
  const categoryConfig = getCategoryConfig(insight.category)
  const Icon = typeConfig.icon
  const CategoryIcon = categoryConfig.icon

  return (
    <div className={`border ${expanded ? 'border-emerald-500/30' : 'border-ghost-border'} bg-ghost-card rounded-xl overflow-hidden transition-all`}>
      <div
        className="p-4 cursor-pointer hover:bg-ghost-card/80 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeConfig.bg}`}>
            <Icon className={`w-5 h-5 ${typeConfig.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="text-sm font-medium text-white">{insight.title}</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${impactBadge.bg} ${impactBadge.text}`}>
                {impactBadge.label}
              </span>
            </div>
            <p className="text-sm text-ghost-muted line-clamp-2">{insight.summary}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-xs text-ghost-muted">
                <CategoryIcon className="w-3 h-3" />
                {categoryConfig.label}
              </div>
              <div className="flex items-center gap-1 text-xs text-ghost-muted">
                <Sparkles className="w-3 h-3" />
                {insight.confidence}% confidence
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSave()
            }}
            className="p-2 hover:bg-ghost-border rounded-lg transition-colors"
          >
            {insight.saved ? (
              <BookmarkCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Bookmark className="w-4 h-4 text-ghost-muted" />
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

export default function InsightsPanel({ businessId }: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'saved' | Insight['type']>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadInsights()
  }, [businessId])

  const loadInsights = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const data = generateInsights()
      setInsights(data)
    } catch (error) {
      console.error('Error loading insights:', error)
    } finally {
      setLoading(false)
    }
  }

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
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            AI-Generated Insights
          </h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-ghost-card rounded-lg transition-colors text-ghost-muted hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-ghost-muted">
          {insights.length} insights based on your business data
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              filter === option.value
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-ghost-card text-ghost-muted hover:text-white border border-ghost-border'
            }`}
          >
            {option.label}
            <span className="text-xs opacity-60">({insightCounts[option.value]})</span>
          </button>
        ))}
      </div>

      {/* Insights List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-ghost-card rounded-full flex items-center justify-center mb-3">
              <Lightbulb className="w-6 h-6 text-ghost-muted" />
            </div>
            <p className="text-ghost-muted">No insights in this category</p>
            <button
              onClick={() => setFilter('all')}
              className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
            >
              View all insights
            </button>
          </div>
        ) : (
          filteredInsights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              expanded={expandedId === insight.id}
              onToggle={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
              onSave={() => handleSave(insight.id)}
              onFeedback={(helpful) => handleFeedback(insight.id, helpful)}
            />
          ))
        )}
      </div>
    </div>
  )
}
