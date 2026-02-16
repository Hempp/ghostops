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
  Calendar,
  Loader2,
  Sparkles,
  X
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

// Mock summary data - in production this would come from API
const getSummaryData = (): SummaryCardData[] => [
  {
    label: 'Pending Actions',
    value: 3,
    subtext: 'Require your approval',
    icon: Clock,
    color: 'amber',
    trend: { value: -2, label: 'from yesterday' }
  },
  {
    label: 'Today\'s Insights',
    value: 6,
    subtext: 'New recommendations',
    icon: Lightbulb,
    color: 'blue',
    trend: { value: 2, label: 'new today' }
  },
  {
    label: 'Goals Progress',
    value: '74%',
    subtext: '4 of 6 on track',
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

function SummaryCard({ data, index }: { data: SummaryCardData; index: number }) {
  const Icon = data.icon
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]'
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]'
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      glow: 'group-hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]'
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      glow: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]'
    },
    red: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/20',
      glow: 'group-hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]'
    }
  }
  const colors = colorClasses[data.color]

  return (
    <div
      className={`group stat-card relative bg-ghost-card/80 backdrop-blur-sm border ${colors.border} rounded-xl md:rounded-2xl p-3 md:p-5
        hover:bg-ghost-card-hover hover:border-ghost-border-subtle
        transition-all duration-500 ease-out-expo cursor-default
        ${colors.glow} animate-fade-in-up`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      <div className="relative flex items-start justify-between mb-2 md:mb-3">
        <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center ${colors.bg}
          transition-transform duration-300 group-hover:scale-110`}>
          <Icon className={`w-4 h-4 md:w-5 md:h-5 ${colors.text}`} />
        </div>
        {data.trend && (
          <div className={`flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 md:py-1 rounded-full
            ${data.trend.value >= 0
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-red-400 bg-red-500/10'}`}>
            <TrendingUp className={`w-2.5 h-2.5 md:w-3 md:h-3 ${data.trend.value < 0 ? 'rotate-180' : ''}`} />
            {data.trend.value > 0 ? '+' : ''}{data.trend.value}
          </div>
        )}
      </div>

      <div className="relative">
        <div className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">{data.value}</div>
        <div className="text-xs md:text-sm font-medium text-ghost-text mt-0.5 md:mt-1 truncate">{data.label}</div>
        {data.subtext && (
          <div className="text-[10px] md:text-xs text-ghost-muted mt-0.5 truncate">{data.subtext}</div>
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
  const colorClasses: Record<string, { bg: string; text: string; border: string; hover: string }> = {
    emerald: {
      bg: 'bg-emerald-500/5',
      text: 'text-emerald-400',
      border: 'border-emerald-500/10',
      hover: 'hover:bg-emerald-500/10 hover:border-emerald-500/20'
    },
    blue: {
      bg: 'bg-blue-500/5',
      text: 'text-blue-400',
      border: 'border-blue-500/10',
      hover: 'hover:bg-blue-500/10 hover:border-blue-500/20'
    },
    amber: {
      bg: 'bg-amber-500/5',
      text: 'text-amber-400',
      border: 'border-amber-500/10',
      hover: 'hover:bg-amber-500/10 hover:border-amber-500/20'
    },
    purple: {
      bg: 'bg-purple-500/5',
      text: 'text-purple-400',
      border: 'border-purple-500/10',
      hover: 'hover:bg-purple-500/10 hover:border-purple-500/20'
    }
  }
  const colors = colorClasses[color] || colorClasses.emerald

  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2 md:gap-3 p-2.5 md:p-3.5 min-h-[48px] ${colors.bg} border ${colors.border}
        rounded-lg md:rounded-xl ${colors.hover} transition-all duration-300 ease-out-expo text-left w-full
        hover:translate-y-[-2px] hover:shadow-premium active:translate-y-0 animate-fade-in-up`}
      style={{ animationDelay: `${400 + index * 75}ms` }}
    >
      <div className={`w-8 h-8 md:w-9 md:h-9 flex-shrink-0 rounded-lg flex items-center justify-center ${colors.bg}
        border ${colors.border} transition-transform duration-300 group-hover:scale-110`}>
        <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm font-semibold text-white group-hover:text-ghost-text transition-colors truncate">{title}</p>
        <p className="text-[10px] md:text-xs text-ghost-muted truncate hidden sm:block">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-ghost-muted group-hover:text-ghost-text
        group-hover:translate-x-1 transition-all duration-300 flex-shrink-0 hidden md:block" />
    </button>
  )
}

export default function CoFounderDashboard({ businessId }: CoFounderDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [summaryData, setSummaryData] = useState<SummaryCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [showBriefing, setShowBriefing] = useState(false)
  const [showWeekly, setShowWeekly] = useState(false)

  const tabs: Tab[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'activity', label: 'Activity', icon: Activity, badge: 3 },
    { id: 'insights', label: 'Insights', icon: Lightbulb, badge: 6 },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  useEffect(() => {
    loadSummaryData()
  }, [businessId])

  const loadSummaryData = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 600))
      const data = getSummaryData()
      setSummaryData(data)
    } catch (error) {
      console.error('Error loading summary:', error)
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop with blur */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

        {/* Modal */}
        <div
          className={`relative bg-ghost-bg/95 backdrop-blur-xl border border-ghost-border
            rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col
            shadow-premium-lg animate-fade-in-scale`}
          onClick={e => e.stopPropagation()}
        >
          {/* Gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-ghost-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-lg font-display font-semibold text-white">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-ghost-card rounded-lg transition-all duration-200
                text-ghost-muted hover:text-white hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-ghost-bg">
      {/* Premium Header with Summary Cards */}
      <div className="p-4 md:p-6 border-b border-ghost-border bg-gradient-to-b from-ghost-card to-ghost-bg">
        {/* Hero Title Row */}
        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 animate-fade-in">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl md:rounded-2xl
              flex items-center justify-center shadow-glow">
              <Brain className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            {/* Pulse indicator */}
            <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span className="relative block w-3 h-3 md:w-4 md:h-4 rounded-full bg-emerald-400 border-2 border-ghost-bg" />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight truncate">AI Co-Founder</h2>
            <p className="text-xs md:text-sm text-ghost-muted truncate">Your strategic business partner, working 24/7</p>
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
      <div className="relative border-b border-ghost-border bg-ghost-card/30 backdrop-blur-sm">
        {/* Fade edges for scroll indication */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-ghost-card/30 to-transparent z-10 pointer-events-none md:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-ghost-card/30 to-transparent z-10 pointer-events-none md:hidden" />

        <div className="flex overflow-x-auto scrollbar-hide px-4 md:px-2 -mx-2 md:mx-0">
          {tabs.map((tab, index) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 md:px-5 min-h-[48px] transition-all duration-300
                  whitespace-nowrap min-w-fit group`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Active indicator */}
                <div className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full transition-all duration-300
                  ${isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 opacity-100'
                    : 'bg-ghost-border opacity-0 group-hover:opacity-50'}`}
                />

                <Icon className={`w-4 h-4 transition-colors duration-200 ${
                  isActive ? 'text-emerald-400' : 'text-ghost-muted group-hover:text-ghost-text'
                }`} />
                <span className={`text-sm font-medium transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-ghost-muted group-hover:text-ghost-text'
                }`}>
                  {tab.label}
                </span>
                {tab.badge && tab.badge > 0 && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'bg-ghost-border/50 text-ghost-muted'
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
