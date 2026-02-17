'use client'

import { useState, useEffect } from 'react'
import {
  Brain,
  MessageSquare,
  Activity,
  Lightbulb,
  Target,
  Settings,
  Bell,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Loader2,
  Sparkles,
  X,
  RefreshCw
} from 'lucide-react'
import CoFounderChat from './CoFounderChat'
import ActivityFeed from './ActivityFeed'
import DailyBriefing from './DailyBriefing'
import WeeklyStrategy from './WeeklyStrategy'
import InsightsPanel from './InsightsPanel'
import GoalsTracker from './GoalsTracker'
import CoFounderSettings from './CoFounderSettings'
import { Skeleton } from '@/components/ui/Skeleton'
import { SectionErrorBoundary } from '@/components/ui/ErrorBoundary'
import {
  getPendingActionsCount,
  getInsightsCount,
  getGoalsProgress,
  isSupabaseConfigured
} from '@/lib/supabase'

type TabId = 'chat' | 'activity' | 'insights' | 'goals' | 'settings'

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
  badge?: number
}

interface SummaryCardData {
  label: string
  value: string | number
  subtext?: string
  icon: React.ElementType
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'red'
  trend?: {
    value: number
    label: string
  }
}

interface CoFounderDashboardProps {
  businessId: string
}

// Build summary data from real API responses
const buildSummaryData = (
  pendingActions: number,
  insightsCount: number,
  goalsProgress: { onTrack: number; total: number; percentage: number }
): SummaryCardData[] => [
  {
    label: 'Pending Actions',
    value: pendingActions,
    subtext: pendingActions === 1 ? 'Requires your approval' : 'Require your approval',
    icon: Clock,
    color: 'amber',
  },
  {
    label: 'Today\'s Insights',
    value: insightsCount,
    subtext: 'New recommendations',
    icon: Lightbulb,
    color: 'blue',
  },
  {
    label: 'Goals Progress',
    value: goalsProgress.total > 0 ? `${goalsProgress.percentage}%` : 'No goals',
    subtext: goalsProgress.total > 0
      ? `${goalsProgress.onTrack} of ${goalsProgress.total} on track`
      : 'Set goals to track',
    icon: Target,
    color: 'purple'
  },
  {
    label: 'AI Confidence',
    value: '87%',
    subtext: 'Learning from you',
    icon: Brain,
    color: 'emerald',
    trend: { value: 3, label: 'this week' }
  }
]

// Fallback data for demo mode or when API fails
const getFallbackSummaryData = (): SummaryCardData[] => buildSummaryData(3, 6, { onTrack: 4, total: 6, percentage: 74 })

function SummaryCard({ data, index }: { data: SummaryCardData; index: number }) {
  const Icon = data.icon
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500/15',
      bgHover: 'group-hover:bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      glow: 'group-hover:shadow-[0_8px_40px_rgba(16,185,129,0.2)]',
      ring: 'group-hover:ring-emerald-500/30'
    },
    blue: {
      bg: 'bg-blue-500/15',
      bgHover: 'group-hover:bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      glow: 'group-hover:shadow-[0_8px_40px_rgba(59,130,246,0.2)]',
      ring: 'group-hover:ring-blue-500/30'
    },
    purple: {
      bg: 'bg-purple-500/15',
      bgHover: 'group-hover:bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      glow: 'group-hover:shadow-[0_8px_40px_rgba(168,85,247,0.2)]',
      ring: 'group-hover:ring-purple-500/30'
    },
    amber: {
      bg: 'bg-amber-500/15',
      bgHover: 'group-hover:bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      glow: 'group-hover:shadow-[0_8px_40px_rgba(245,158,11,0.2)]',
      ring: 'group-hover:ring-amber-500/30'
    },
    red: {
      bg: 'bg-red-500/15',
      bgHover: 'group-hover:bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/20',
      glow: 'group-hover:shadow-[0_8px_40px_rgba(239,68,68,0.2)]',
      ring: 'group-hover:ring-red-500/30'
    }
  }
  const colors = colorClasses[data.color]

  return (
    <div
      className={`group card-refined card-interactive relative bg-ghost-card/90 backdrop-blur-md border ${colors.border} rounded-xl md:rounded-2xl p-4 md:p-5
        hover:bg-ghost-card hover:border-ghost-border-subtle
        cursor-default ring-1 ring-transparent ${colors.ring}
        ${colors.glow} animate-fade-in-up`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Refined gradient overlay */}
      <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.01] pointer-events-none" />

      <div className="relative flex items-start justify-between mb-3 md:mb-4">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${colors.bg} ${colors.bgHover}
          transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className={`w-5 h-5 md:w-6 md:h-6 ${colors.text} drop-shadow-sm`} />
        </div>
        {data.trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm
            transition-transform duration-300 group-hover:scale-105
            ${data.trend.value >= 0
              ? 'text-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-500/20'
              : 'text-red-400 bg-red-500/15 ring-1 ring-red-500/20'}`}>
            <TrendingUp className={`w-3 h-3 ${data.trend.value < 0 ? 'rotate-180' : ''}`} />
            <span className="tabular-nums">{data.trend.value > 0 ? '+' : ''}{data.trend.value}%</span>
          </div>
        )}
      </div>

      <div className="relative space-y-1">
        <div className="text-3xl md:text-4xl font-display font-bold text-white text-headline animate-count tabular-nums">
          {data.value}
        </div>
        <div className="text-sm md:text-base font-medium text-ghost-text truncate">{data.label}</div>
        {data.subtext && (
          <div className="text-xs text-ghost-muted truncate">{data.subtext}</div>
        )}
      </div>
    </div>
  )
}

function SummaryCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="bg-ghost-card/60 backdrop-blur-sm border border-ghost-border rounded-2xl p-5 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="skeleton w-11 h-11 rounded-xl" />
        <div className="skeleton w-12 h-5 rounded-full" />
      </div>
      <div className="skeleton w-16 h-9 mb-2 rounded-lg" />
      <div className="skeleton w-24 h-4 mb-1 rounded" />
      <div className="skeleton w-20 h-3 rounded" />
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
    <div className={`mb-4 md:mb-5 p-3 rounded-lg border ${bgColor} ${borderColor}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${textColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${textColor}`}>
            {isError ? 'Error Loading Data' : 'Showing Demo Data'}
          </p>
          <p className="text-xs text-ghost-muted mt-0.5">
            {error || 'Unable to connect to backend. Displaying sample dashboard data.'}
          </p>
          <button
            onClick={onRetry}
            className={`mt-2 text-xs font-medium ${textColor} hover:underline inline-flex items-center gap-1`}
          >
            <RefreshCw className="w-3 h-3" />
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

function QuickActionCard({
  title,
  description,
  icon: Icon,
  color,
  onClick,
  index
}: {
  title: string
  description: string
  icon: React.ElementType
  color: string
  onClick: () => void
  index: number
}) {
  const colorClasses: Record<string, { bg: string; text: string; border: string; hover: string; glow: string }> = {
    emerald: {
      bg: 'bg-emerald-500/8',
      text: 'text-emerald-400',
      border: 'border-emerald-500/15',
      hover: 'hover:bg-emerald-500/12 hover:border-emerald-500/25',
      glow: 'hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
    },
    blue: {
      bg: 'bg-blue-500/8',
      text: 'text-blue-400',
      border: 'border-blue-500/15',
      hover: 'hover:bg-blue-500/12 hover:border-blue-500/25',
      glow: 'hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]'
    },
    amber: {
      bg: 'bg-amber-500/8',
      text: 'text-amber-400',
      border: 'border-amber-500/15',
      hover: 'hover:bg-amber-500/12 hover:border-amber-500/25',
      glow: 'hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]'
    },
    purple: {
      bg: 'bg-purple-500/8',
      text: 'text-purple-400',
      border: 'border-purple-500/15',
      hover: 'hover:bg-purple-500/12 hover:border-purple-500/25',
      glow: 'hover:shadow-[0_4px_20px_rgba(168,85,247,0.15)]'
    }
  }
  const colors = colorClasses[color] || colorClasses.emerald

  return (
    <button
      onClick={onClick}
      className={`group btn-shine flex items-center gap-3 p-3 md:p-4 min-h-[56px] ${colors.bg} border ${colors.border}
        rounded-xl ${colors.hover} ${colors.glow} transition-all duration-300 ease-out-expo text-left w-full
        hover:translate-y-[-3px] active:translate-y-[-1px] animate-fade-in-up backdrop-blur-sm`}
      style={{ animationDelay: `${400 + index * 75}ms` }}
    >
      <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${colors.bg}
        border ${colors.border} transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-3deg]`}>
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${colors.text} drop-shadow-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white transition-colors truncate">{title}</p>
        <p className="text-xs text-ghost-muted truncate hidden sm:block mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0 hidden md:flex items-center justify-center w-6 h-6 rounded-full
        bg-ghost-border/50 group-hover:bg-ghost-border transition-all duration-300
        group-hover:translate-x-1">
        <ChevronRight className={`w-3.5 h-3.5 ${colors.text} transition-colors`} />
      </div>
    </button>
  )
}

export default function CoFounderDashboard({ businessId }: CoFounderDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [summaryData, setSummaryData] = useState<SummaryCardData[]>([])
  const [pendingActionsCount, setPendingActionsCount] = useState(3)
  const [insightsCount, setInsightsCount] = useState(6)
  const [loading, setLoading] = useState(true)
  const [showBriefing, setShowBriefing] = useState(false)
  const [showWeekly, setShowWeekly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  const [errorDismissed, setErrorDismissed] = useState(false)

  const tabs: Tab[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'activity', label: 'Activity', icon: Activity, badge: pendingActionsCount },
    { id: 'insights', label: 'Insights', icon: Lightbulb, badge: insightsCount },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  useEffect(() => {
    loadSummaryData()
  }, [businessId])

  const loadSummaryData = async () => {
    setLoading(true)
    setError(null)
    setIsUsingFallback(false)
    setErrorDismissed(false)

    // If Supabase is not configured, use fallback data
    if (!isSupabaseConfigured) {
      await new Promise(resolve => setTimeout(resolve, 600))
      setSummaryData(getFallbackSummaryData())
      setIsUsingFallback(true)
      setLoading(false)
      return
    }

    try {
      // Fetch real data from the database in parallel
      const [pendingActions, insights, goalsProgress] = await Promise.all([
        getPendingActionsCount(businessId).catch(() => 0),
        getInsightsCount(businessId).catch(() => 0),
        getGoalsProgress(businessId).catch(() => ({ onTrack: 0, total: 0, percentage: 0 }))
      ])

      // Update badge counts for tabs
      setPendingActionsCount(pendingActions)
      setInsightsCount(insights)

      // Build summary data from real values
      const data = buildSummaryData(pendingActions, insights, goalsProgress)
      setSummaryData(data)
    } catch (err) {
      console.error('Error loading summary:', err)
      setError('Failed to load dashboard data. Showing demo data.')
      // Fall back to demo data on error
      setSummaryData(getFallbackSummaryData())
      setIsUsingFallback(true)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'briefing':
        setShowBriefing(true)
        break
      case 'weekly':
        setShowWeekly(true)
        break
      case 'pending':
        setActiveTab('activity')
        break
      case 'goals':
        setActiveTab('goals')
        break
    }
  }

  // Premium Modal Component
  const PremiumModal = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-2xl'
  }: {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    maxWidth?: string
  }) => {
    if (!isOpen) return null

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
        onClick={onClose}
      >
        {/* Backdrop with blur and gradient */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in" />

        {/* Ambient glow behind modal */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse-glow" />
        </div>

        {/* Modal */}
        <div
          className={`relative bg-ghost-bg/98 backdrop-blur-2xl border border-ghost-border/80
            rounded-3xl w-full ${maxWidth} max-h-[85vh] overflow-hidden flex flex-col
            shadow-[0_25px_80px_rgba(0,0,0,0.6)] animate-fade-in-scale`}
          onClick={e => e.stopPropagation()}
        >
          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-tl-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-teal-500/5 to-transparent rounded-br-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center justify-between p-5 md:p-6 border-b border-ghost-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10
                flex items-center justify-center ring-1 ring-emerald-500/20">
                <Sparkles className="w-5 h-5 text-emerald-400 drop-shadow-sm" />
              </div>
              <h3 className="text-xl font-display font-bold text-white text-headline">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-ghost-card rounded-xl transition-all duration-300
                text-ghost-muted hover:text-white hover:rotate-90 hover:scale-110
                focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-ghost-bg relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="ambient-orb ambient-orb-emerald w-[500px] h-[500px] -top-40 -right-20" style={{ animationDelay: '0s' }} />
        <div className="ambient-orb ambient-orb-teal w-[400px] h-[400px] top-1/3 -left-32" style={{ animationDelay: '-7s' }} />
        <div className="ambient-orb ambient-orb-purple w-[350px] h-[350px] bottom-20 right-1/4" style={{ animationDelay: '-13s' }} />
      </div>

      {/* Premium Header with Summary Cards */}
      <div className="relative p-4 md:p-6 border-b border-ghost-border header-premium mesh-gradient">
        {/* Hero Title Row */}
        <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-7 animate-fade-in">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl
              flex items-center justify-center shadow-glow icon-glow transition-transform duration-300 hover:scale-105">
              <Brain className="w-7 h-7 md:w-8 md:h-8 text-white drop-shadow-sm" />
            </div>
            {/* Live indicator with breathing animation */}
            <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5">
              <span className="absolute inset-0 rounded-full bg-emerald-400/50 animate-breathe" />
              <span className="relative block w-4 h-4 md:w-5 md:h-5 rounded-full bg-emerald-400 border-2 border-ghost-bg shadow-glow" />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white text-headline text-premium truncate">
              AI Co-Founder
            </h2>
            <p className="text-sm md:text-base text-ghost-muted truncate mt-0.5">
              Your strategic business partner, working 24/7
            </p>
          </div>
        </div>

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-5">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <SummaryCardSkeleton key={i} index={i} />
              ))}
            </>
          ) : (
            summaryData.map((data, i) => (
              <SummaryCard key={i} data={data} index={i} />
            ))
          )}
        </div>

        {/* Error/Fallback Banner */}
        {!errorDismissed && (
          <ErrorBanner
            error={error}
            isUsingFallback={isUsingFallback}
            onRetry={loadSummaryData}
            onDismiss={() => setErrorDismissed(true)}
          />
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <QuickActionCard
            title="Daily Briefing"
            description="Your morning summary"
            icon={Calendar}
            color="emerald"
            onClick={() => handleQuickAction('briefing')}
            index={0}
          />
          <QuickActionCard
            title="Weekly Review"
            description="Performance & strategy"
            icon={TrendingUp}
            color="blue"
            onClick={() => handleQuickAction('weekly')}
            index={1}
          />
          <QuickActionCard
            title="Pending Approvals"
            description="3 items waiting"
            icon={Clock}
            color="amber"
            onClick={() => handleQuickAction('pending')}
            index={2}
          />
          <QuickActionCard
            title="Goal Updates"
            description="Check your progress"
            icon={Target}
            color="purple"
            onClick={() => handleQuickAction('goals')}
            index={3}
          />
        </div>
      </div>

      {/* Premium Tab Navigation - Mobile Optimized */}
      <div className="relative border-b border-ghost-border/60 bg-ghost-card/40 backdrop-blur-md">
        {/* Fade edges for scroll indication */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-ghost-card/60 to-transparent z-10 pointer-events-none md:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-ghost-card/60 to-transparent z-10 pointer-events-none md:hidden" />

        <div className="flex overflow-x-auto scrollbar-hide px-4 md:px-3">
          {tabs.map((tab, index) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2.5 px-4 md:px-5 py-3.5 min-h-[52px] transition-all duration-300
                  whitespace-nowrap min-w-fit group`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Active background */}
                {isActive && (
                  <div className="absolute inset-x-1 inset-y-1.5 bg-ghost-card/80 rounded-lg -z-10" />
                )}

                {/* Active indicator line with glow */}
                <div className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full transition-all duration-300
                  ${isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 opacity-100 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : 'bg-ghost-border opacity-0 group-hover:opacity-40'}`}
                />

                <Icon className={`w-[18px] h-[18px] transition-all duration-200 ${
                  isActive ? 'text-emerald-400 drop-shadow-sm' : 'text-ghost-muted group-hover:text-ghost-text'
                }`} />
                <span className={`text-sm font-medium transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-ghost-muted group-hover:text-ghost-text'
                }`}>
                  {tab.label}
                </span>
                {tab.badge && tab.badge > 0 && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all duration-200 tabular-nums ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-ghost-border/60 text-ghost-muted'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <SectionErrorBoundary section="Co-Founder Chat">
            <CoFounderChat businessId={businessId} />
          </SectionErrorBoundary>
        )}

        {activeTab === 'activity' && (
          <div className="h-full overflow-y-auto p-5 custom-scrollbar">
            <SectionErrorBoundary section="Activity Feed">
              <ActivityFeed businessId={businessId} showHeader={true} />
            </SectionErrorBoundary>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="h-full overflow-y-auto p-5 custom-scrollbar">
            <SectionErrorBoundary section="Insights">
              <InsightsPanel businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="h-full overflow-y-auto p-5 custom-scrollbar">
            <SectionErrorBoundary section="Goals">
              <GoalsTracker businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-5 custom-scrollbar">
            <SectionErrorBoundary section="Settings">
              <CoFounderSettings businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        )}
      </div>

      {/* Premium Modals */}
      <PremiumModal
        isOpen={showBriefing}
        onClose={() => setShowBriefing(false)}
        title="Daily Briefing"
      >
        <SectionErrorBoundary section="Daily Briefing">
          <DailyBriefing businessId={businessId} />
        </SectionErrorBoundary>
      </PremiumModal>

      <PremiumModal
        isOpen={showWeekly}
        onClose={() => setShowWeekly(false)}
        title="Weekly Strategy Review"
        maxWidth="max-w-3xl"
      >
        <SectionErrorBoundary section="Weekly Strategy">
          <WeeklyStrategy businessId={businessId} />
        </SectionErrorBoundary>
      </PremiumModal>
    </div>
  )
}
