'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Lightbulb,
  Target,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  RefreshCw,
  Award,
  AlertTriangle,
  Rocket,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface WeeklyMetric {
  label: string
  thisWeek: number
  lastWeek: number
  unit?: string
  prefix?: string
  icon: React.ElementType
  color: string
}

interface WhatWorked {
  id: string
  title: string
  impact: string
  details: string
}

interface WhatDidnt {
  id: string
  title: string
  issue: string
  suggestion: string
}

interface StrategyRecommendation {
  id: string
  title: string
  description: string
  expectedImpact: string
  effort: 'low' | 'medium' | 'high'
  priority: number
}

interface GoalAdjustment {
  id: string
  goalName: string
  currentTarget: string
  suggestedTarget: string
  reason: string
  direction: 'increase' | 'decrease' | 'maintain'
}

interface WeeklyStrategyData {
  weekEnding: Date
  summary: string
  overallScore: number
  metrics: WeeklyMetric[]
  whatWorked: WhatWorked[]
  whatDidnt: WhatDidnt[]
  recommendations: StrategyRecommendation[]
  goalAdjustments: GoalAdjustment[]
  isDemo?: boolean
}

interface WeeklyStrategyProps {
  businessId: string
}

// API response types
interface APIWeeklyStrategyReport {
  id: string
  businessId: string
  weekStart: string
  weekEnd: string
  executiveSummary: string
  overallScore: number
  metrics: {
    totalLeads: number
    totalLeadsLastWeek: number
    totalRevenue: number
    totalRevenueLastWeek: number
    conversionRate: number
    conversionRateLastWeek: number
    totalMessages: number
    totalMessagesLastWeek: number
    invoicesSent: number
    invoicesPaid: number
    missedCalls: number
    reviewsReceived: number
    postsPublished: number
  }
  goals: {
    leadsTarget: number
    revenueTarget: number
    conversionTarget: number
  }
  vsGoals: {
    leadsVsTarget: number
    revenueVsTarget: number
    conversionVsTarget: number
  }
  analysis: {
    whatWorked: string[]
    whatDidntWork: string[]
    keyInsights: string[]
  }
  recommendations: Array<{
    category: string
    priority: string
    title: string
    description: string
    expectedImpact: string
  }>
  weeklyAgenda: string[]
  createdAt: string
  _source: 'reports' | 'notifications'
}

interface APIResponse {
  report: APIWeeklyStrategyReport | null
  message?: string
  source?: string
  error?: string
}

// Transform API response to component format
function transformAPIResponse(report: APIWeeklyStrategyReport): WeeklyStrategyData {
  const metrics: WeeklyMetric[] = [
    {
      label: 'Revenue',
      thisWeek: report.metrics.totalRevenue / 100, // Convert cents to dollars
      lastWeek: report.metrics.totalRevenueLastWeek / 100,
      prefix: '$',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      label: 'New Leads',
      thisWeek: report.metrics.totalLeads,
      lastWeek: report.metrics.totalLeadsLastWeek,
      icon: Users,
      color: 'blue'
    },
    {
      label: 'Conversion Rate',
      thisWeek: Math.round(report.metrics.conversionRate),
      lastWeek: Math.round(report.metrics.conversionRateLastWeek),
      unit: '%',
      icon: Target,
      color: 'purple'
    },
    {
      label: 'Messages Handled',
      thisWeek: report.metrics.totalMessages,
      lastWeek: report.metrics.totalMessagesLastWeek,
      icon: MessageSquare,
      color: 'amber'
    }
  ]

  // Transform whatWorked from string array to structured format
  const whatWorked: WhatWorked[] = report.analysis.whatWorked.map((item, index) => ({
    id: `worked-${index}`,
    title: item,
    impact: 'Positive impact',
    details: item
  }))

  // Transform whatDidntWork from string array to structured format
  const whatDidnt: WhatDidnt[] = report.analysis.whatDidntWork.map((item, index) => ({
    id: `didnt-${index}`,
    title: item.split('.')[0] || item,
    issue: item,
    suggestion: report.analysis.keyInsights[index] || 'Review and optimize this area.'
  }))

  // Transform recommendations with effort level based on priority
  const recommendations: StrategyRecommendation[] = report.recommendations.map((rec, index) => ({
    id: `rec-${index}`,
    title: rec.title,
    description: rec.description,
    expectedImpact: rec.expectedImpact,
    effort: rec.priority === 'high' ? 'low' : rec.priority === 'medium' ? 'medium' : 'high',
    priority: index + 1
  }))

  // Generate goal adjustments based on vsGoals
  const goalAdjustments: GoalAdjustment[] = []

  if (report.vsGoals.leadsVsTarget > 10) {
    goalAdjustments.push({
      id: 'adj-leads',
      goalName: 'Lead Target',
      currentTarget: `${Math.round(report.goals.leadsTarget)} leads`,
      suggestedTarget: `${Math.round(report.goals.leadsTarget * 1.15)} leads`,
      reason: `You're exceeding target by ${Math.round(report.vsGoals.leadsVsTarget)}%. Time to raise the bar.`,
      direction: 'increase'
    })
  }

  if (report.vsGoals.revenueVsTarget > 10) {
    goalAdjustments.push({
      id: 'adj-revenue',
      goalName: 'Revenue Target',
      currentTarget: `$${Math.round(report.goals.revenueTarget / 100).toLocaleString()}`,
      suggestedTarget: `$${Math.round(report.goals.revenueTarget * 1.15 / 100).toLocaleString()}`,
      reason: `Revenue is ${Math.round(report.vsGoals.revenueVsTarget)}% above target. Consider raising your goal.`,
      direction: 'increase'
    })
  }

  return {
    weekEnding: new Date(report.weekEnd),
    summary: report.executiveSummary,
    overallScore: report.overallScore,
    metrics,
    whatWorked,
    whatDidnt,
    recommendations,
    goalAdjustments,
    isDemo: false
  }
}

// Demo data generator for fallback
const generateDemoData = (): WeeklyStrategyData => {
  return {
    weekEnding: new Date(),
    summary: "This is demo data. Your weekly strategy report will appear here once generated. Reports are created automatically each week based on your business performance data.",
    overallScore: 78,
    metrics: [
      {
        label: 'Revenue',
        thisWeek: 8450,
        lastWeek: 6870,
        prefix: '$',
        icon: DollarSign,
        color: 'emerald'
      },
      {
        label: 'New Leads',
        thisWeek: 34,
        lastWeek: 28,
        icon: Users,
        color: 'blue'
      },
      {
        label: 'Conversion Rate',
        thisWeek: 24,
        lastWeek: 19,
        unit: '%',
        icon: Target,
        color: 'purple'
      },
      {
        label: 'Messages Handled',
        thisWeek: 245,
        lastWeek: 198,
        icon: MessageSquare,
        color: 'amber'
      }
    ],
    whatWorked: [
      {
        id: '1',
        title: 'Personalized follow-up sequences',
        impact: '+15% conversion',
        details: 'The 3-touch sequence with personalized timing based on customer behavior patterns showed significant improvement in response rates.'
      },
      {
        id: '2',
        title: 'Same-day quote responses',
        impact: '4 new customers',
        details: 'Responding to quote requests within 1 hour resulted in 4 new bookings that would have otherwise gone to competitors.'
      },
      {
        id: '3',
        title: 'Weekend engagement posts',
        impact: '+40% engagement',
        details: 'Saturday morning posts about behind-the-scenes work generated 40% more comments and shares than weekday content.'
      }
    ],
    whatDidnt: [
      {
        id: '1',
        title: 'Peak hour response delays',
        issue: 'Average 8-minute response time between 2-4pm',
        suggestion: 'Consider adding priority queue for high-value leads during peak hours.'
      },
      {
        id: '2',
        title: 'Email newsletter open rates',
        issue: 'Only 12% open rate (down from 18%)',
        suggestion: 'Test new subject lines and send times. Consider segmenting list by engagement level.'
      }
    ],
    recommendations: [
      {
        id: '1',
        title: 'Launch referral incentive program',
        description: 'Your satisfied customers are a huge untapped resource. A simple $50 credit for referrals could generate 5-10 new leads monthly.',
        expectedImpact: '+8-12 leads/month',
        effort: 'low',
        priority: 1
      },
      {
        id: '2',
        title: 'Implement peak-hour priority routing',
        description: 'Route high-value leads to immediate response during 2-4pm. This addresses the main pain point identified this week.',
        expectedImpact: '+$2,000/month',
        effort: 'medium',
        priority: 2
      },
      {
        id: '3',
        title: 'Create service package bundles',
        description: 'Based on purchase patterns, bundling your top 3 services at 10% discount could increase average order value.',
        expectedImpact: '+18% AOV',
        effort: 'medium',
        priority: 3
      }
    ],
    goalAdjustments: [
      {
        id: '1',
        goalName: 'Monthly Revenue',
        currentTarget: '$25,000',
        suggestedTarget: '$28,000',
        reason: 'Current trajectory puts you at $30k. Raising target maintains motivation.',
        direction: 'increase'
      },
      {
        id: '2',
        goalName: 'Response Time',
        currentTarget: '< 2 min',
        suggestedTarget: '< 90 sec',
        reason: 'You\'re consistently hitting 2 min. Time to push for faster responses.',
        direction: 'increase'
      }
    ],
    isDemo: true
  }
}

const getChangePercent = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

const getMetricColor = (color: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-600/20', text: 'text-emerald-400' },
    blue: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
    purple: { bg: 'bg-purple-600/20', text: 'text-purple-400' },
    amber: { bg: 'bg-amber-600/20', text: 'text-amber-400' }
  }
  return colors[color] || colors.blue
}

const getEffortBadge = (effort: StrategyRecommendation['effort']) => {
  switch (effort) {
    case 'low':
      return { bg: 'bg-emerald-600/20', text: 'text-emerald-400', label: 'Quick Win' }
    case 'medium':
      return { bg: 'bg-amber-600/20', text: 'text-amber-400', label: 'Medium Effort' }
    case 'high':
      return { bg: 'bg-red-600/20', text: 'text-red-400', label: 'Major Project' }
  }
}

function WeeklyMetricCard({ metric }: { metric: WeeklyMetric }) {
  const Icon = metric.icon
  const colors = getMetricColor(metric.color)
  const change = getChangePercent(metric.thisWeek, metric.lastWeek)
  const isPositive = change >= 0

  const formatValue = (val: number) => {
    const formatted = val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString()
    return `${metric.prefix || ''}${formatted}${metric.unit || ''}`
  }

  return (
    <div className="bg-ghost-card border border-ghost-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="text-xl font-bold text-white">{formatValue(metric.thisWeek)}</div>
      <div className="text-xs text-ghost-muted">{metric.label}</div>
      <div className="text-[10px] text-ghost-muted mt-1">
        vs {formatValue(metric.lastWeek)} last week
      </div>
    </div>
  )
}

function ScoreGauge({ score }: { score: number }) {
  const getScoreColor = () => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-red-400'
  }

  const getScoreLabel = () => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Needs Improvement'
    return 'Critical'
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-ghost-border"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${(score / 100) * 226} 226`}
            strokeLinecap="round"
            className={getScoreColor()}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${getScoreColor()}`}>{score}</span>
        </div>
      </div>
      <div>
        <div className={`text-sm font-medium ${getScoreColor()}`}>{getScoreLabel()}</div>
        <div className="text-xs text-ghost-muted">Weekly Score</div>
      </div>
    </div>
  )
}

function ExpandableSection({
  title,
  icon: Icon,
  iconColor,
  children,
  defaultOpen = false
}: {
  title: string
  icon: React.ElementType
  iconColor: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-ghost-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-ghost-card/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <span className="font-medium text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-ghost-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ghost-muted" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-ghost-border">
          {children}
        </div>
      )}
    </div>
  )
}

function StrategySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="w-48 h-8" />
        <Skeleton className="w-20 h-20 rounded-full" />
      </div>
      <Skeleton className="w-full h-20 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="w-full h-16 rounded-xl" />
      <Skeleton className="w-full h-16 rounded-xl" />
    </div>
  )
}

export default function WeeklyStrategy({ businessId }: WeeklyStrategyProps) {
  const [data, setData] = useState<WeeklyStrategyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStrategy = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cofounder/weekly-strategy?businessId=${encodeURIComponent(businessId)}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const result: APIResponse = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      if (result.report) {
        // Transform API response to component format
        const transformedData = transformAPIResponse(result.report)
        setData(transformedData)
      } else {
        // No report found, use demo data
        console.log('No weekly strategy report found, using demo data')
        setData(generateDemoData())
      }
    } catch (err) {
      console.error('Error loading strategy:', err)
      setError(err instanceof Error ? err.message : 'Failed to load strategy')
      // Fall back to demo data on error
      setData(generateDemoData())
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadStrategy()
  }, [loadStrategy])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStrategy()
    setRefreshing(false)
  }

  if (loading) {
    return <StrategySkeleton />
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="w-12 h-12 text-ghost-muted mb-4" />
        <p className="text-ghost-muted">Unable to load weekly strategy</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      {data.isDemo && (
        <div className="flex items-center gap-3 p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-300">
            Showing sample data. Your personalized weekly strategy will appear here once generated based on your business activity.
          </p>
        </div>
      )}

      {/* Error Banner (if using fallback data after error) */}
      {error && data.isDemo && (
        <div className="flex items-center gap-3 p-3 bg-amber-600/10 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            Could not load latest data. Showing sample strategy.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Weekly Strategy Review
            {data.isDemo && (
              <span className="text-xs font-normal text-ghost-muted bg-ghost-card px-2 py-0.5 rounded-full">
                Sample
              </span>
            )}
          </h2>
          <p className="text-sm text-ghost-muted mt-1">
            Week ending {data.weekEnding.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-ghost-card rounded-lg transition-colors text-ghost-muted hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <ScoreGauge score={data.overallScore} />
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-xl">
        <p className="text-sm text-ghost-text leading-relaxed">{data.summary}</p>
      </div>

      {/* Metrics Grid */}
      <div>
        <h3 className="text-sm font-medium text-ghost-muted mb-3 uppercase tracking-wide">Performance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.metrics.map((metric, i) => (
            <WeeklyMetricCard key={i} metric={metric} />
          ))}
        </div>
      </div>

      {/* What Worked */}
      <ExpandableSection
        title={`What Worked (${data.whatWorked.length})`}
        icon={CheckCircle}
        iconColor="text-emerald-400"
        defaultOpen={true}
      >
        <div className="space-y-3 mt-4">
          {data.whatWorked.map(item => (
            <div key={item.id} className="p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-start justify-between mb-1">
                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                <span className="text-xs text-emerald-400 bg-emerald-600/20 px-2 py-0.5 rounded-full">
                  {item.impact}
                </span>
              </div>
              <p className="text-xs text-ghost-muted">{item.details}</p>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* What Didn't Work */}
      <ExpandableSection
        title={`Areas to Improve (${data.whatDidnt.length})`}
        icon={AlertTriangle}
        iconColor="text-amber-400"
      >
        <div className="space-y-3 mt-4">
          {data.whatDidnt.map(item => (
            <div key={item.id} className="p-3 bg-amber-600/10 border border-amber-500/20 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-1">{item.title}</h4>
              <p className="text-xs text-red-400 mb-2">{item.issue}</p>
              <div className="flex items-start gap-2">
                <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-ghost-text">{item.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* Strategy Recommendations */}
      <ExpandableSection
        title="Strategy Recommendations"
        icon={Rocket}
        iconColor="text-blue-400"
        defaultOpen={true}
      >
        <div className="space-y-3 mt-4">
          {data.recommendations.map((rec, index) => {
            const effort = getEffortBadge(rec.effort)
            return (
              <div key={rec.id} className="p-4 bg-ghost-card border border-ghost-border rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-400">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-white">{rec.title}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${effort.bg} ${effort.text}`}>
                        {effort.label}
                      </span>
                    </div>
                    <p className="text-xs text-ghost-muted mb-2">{rec.description}</p>
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs text-emerald-400">{rec.expectedImpact}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ExpandableSection>

      {/* Goal Adjustments */}
      {data.goalAdjustments.length > 0 && (
        <ExpandableSection
          title="Suggested Goal Adjustments"
          icon={Target}
          iconColor="text-purple-400"
        >
          <div className="space-y-3 mt-4">
            {data.goalAdjustments.map(adj => (
              <div key={adj.id} className="p-3 bg-purple-600/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">{adj.goalName}</h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-ghost-muted">{adj.currentTarget}</span>
                    <ArrowRight className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-400 font-medium">{adj.suggestedTarget}</span>
                  </div>
                </div>
                <p className="text-xs text-ghost-muted">{adj.reason}</p>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}
    </div>
  )
}
