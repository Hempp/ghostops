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
  Loader2
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

function SummaryCard({ data }: { data: SummaryCardData }) {
  const Icon = data.icon
  const colorClasses = {
    emerald: { bg: 'bg-emerald-600/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    blue: { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    purple: { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    amber: { bg: 'bg-amber-600/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    red: { bg: 'bg-red-600/20', text: 'text-red-400', border: 'border-red-500/30' }
  }
  const colors = colorClasses[data.color]

  return (
    <div className={`bg-ghost-card border ${colors.border} rounded-xl p-4 hover:bg-ghost-card/80 transition-colors`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        {data.trend && (
          <div className={`flex items-center gap-1 text-xs ${data.trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-3 h-3 ${data.trend.value < 0 ? 'rotate-180' : ''}`} />
            {data.trend.value > 0 ? '+' : ''}{data.trend.value}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{data.value}</div>
      <div className="text-xs text-ghost-muted">{data.label}</div>
      {data.subtext && (
        <div className="text-[10px] text-ghost-muted mt-1">{data.subtext}</div>
      )}
    </div>
  )
}

function SummaryCardSkeleton() {
  return (
    <div className="bg-ghost-card border border-ghost-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-8 h-4" />
      </div>
      <Skeleton className="w-16 h-8 mb-1" />
      <Skeleton className="w-24 h-3 mb-1" />
      <Skeleton className="w-20 h-2" />
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  color,
  onClick
}: {
  title: string
  description: string
  icon: React.ElementType
  color: string
  onClick: () => void
}) {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-600/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    blue: { bg: 'bg-blue-600/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    amber: { bg: 'bg-amber-600/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    purple: { bg: 'bg-purple-600/10', text: 'text-purple-400', border: 'border-purple-500/20' }
  }
  const colors = colorClasses[color] || colorClasses.emerald

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 ${colors.bg} border ${colors.border} rounded-xl hover:bg-opacity-75 transition-colors text-left w-full`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
        <Icon className={`w-4 h-4 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-ghost-muted truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-ghost-muted" />
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

  // Modal for Daily Briefing
  const BriefingModal = () => {
    if (!showBriefing) return null
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-ghost-bg border border-ghost-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-ghost-border">
            <h3 className="text-lg font-semibold text-white">Daily Briefing</h3>
            <button
              onClick={() => setShowBriefing(false)}
              className="p-2 hover:bg-ghost-card rounded-lg transition-colors text-ghost-muted"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <SectionErrorBoundary section="Daily Briefing">
              <DailyBriefing businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        </div>
      </div>
    )
  }

  // Modal for Weekly Strategy
  const WeeklyModal = () => {
    if (!showWeekly) return null
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-ghost-bg border border-ghost-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-ghost-border">
            <h3 className="text-lg font-semibold text-white">Weekly Strategy Review</h3>
            <button
              onClick={() => setShowWeekly(false)}
              className="p-2 hover:bg-ghost-card rounded-lg transition-colors text-ghost-muted"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <SectionErrorBoundary section="Weekly Strategy">
              <WeeklyStrategy businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-ghost-bg">
      {/* Header with Summary Cards */}
      <div className="p-4 border-b border-ghost-border bg-ghost-card">
        {/* Title Row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Co-Founder</h2>
            <p className="text-xs text-ghost-muted">Your strategic business partner</p>
          </div>
        </div>

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <SummaryCardSkeleton key={i} />
              ))}
            </>
          ) : (
            summaryData.map((data, i) => (
              <SummaryCard key={i} data={data} />
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <QuickActionCard
            title="Daily Briefing"
            description="Your morning summary"
            icon={Calendar}
            color="emerald"
            onClick={() => handleQuickAction('briefing')}
          />
          <QuickActionCard
            title="Weekly Review"
            description="Performance & strategy"
            icon={TrendingUp}
            color="blue"
            onClick={() => handleQuickAction('weekly')}
          />
          <QuickActionCard
            title="Pending Approvals"
            description="3 items waiting"
            icon={Clock}
            color="amber"
            onClick={() => handleQuickAction('pending')}
          />
          <QuickActionCard
            title="Goal Updates"
            description="Check your progress"
            icon={Target}
            color="purple"
            onClick={() => handleQuickAction('goals')}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-ghost-border bg-ghost-card/50">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap min-w-fit ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-ghost-muted hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-emerald-600/20 text-emerald-400' : 'bg-ghost-border text-ghost-muted'
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
          <div className="h-full overflow-y-auto p-4">
            <SectionErrorBoundary section="Activity Feed">
              <ActivityFeed businessId={businessId} showHeader={true} />
            </SectionErrorBoundary>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="h-full overflow-y-auto p-4">
            <SectionErrorBoundary section="Insights">
              <InsightsPanel businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="h-full overflow-y-auto p-4">
            <SectionErrorBoundary section="Goals">
              <GoalsTracker businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-4">
            <SectionErrorBoundary section="Settings">
              <CoFounderSettings businessId={businessId} />
            </SectionErrorBoundary>
          </div>
        )}
      </div>

      {/* Modals */}
      <BriefingModal />
      <WeeklyModal />
    </div>
  )
}
