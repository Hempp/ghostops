'use client'

import { useEffect, useState } from 'react'
import { Users, MessageSquare, DollarSign, Phone, Clock, TrendingUp, Info } from 'lucide-react'
import { toast } from 'sonner'
import { getStats, getInvoices, subscribeToStats, type DailyStats, type Invoice } from '@/lib/supabase'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import Tooltip from '@/components/ui/Tooltip'

interface StatsOverviewProps {
  businessId: string
}

interface AggregatedStats {
  newLeads: number
  messagesSent: number
  messagesReceived: number
  missedCalls: number
  revenueToday: number
  unpaidInvoices: number
  unpaidAmount: number
}

export default function StatsOverview({ businessId }: StatsOverviewProps) {
  const [stats, setStats] = useState<AggregatedStats | null>(null)
  const [recentStats, setRecentStats] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const [dailyStats, invoices] = await Promise.all([
          getStats(businessId, 7),
          getInvoices(businessId)
        ])

        setRecentStats(dailyStats)

        // Get today's stats
        const today = new Date().toISOString().split('T')[0]
        const todayStats = dailyStats.find(s => s.date === today)

        // Calculate unpaid invoices
        const unpaid = invoices.filter(i => i.status !== 'paid')
        const unpaidTotal = unpaid.reduce((sum, inv) => sum + inv.amount_cents, 0)

        // Aggregate last 7 days
        const aggregated: AggregatedStats = {
          newLeads: todayStats?.new_leads || 0,
          messagesSent: todayStats?.messages_sent || 0,
          messagesReceived: todayStats?.messages_received || 0,
          missedCalls: todayStats?.missed_calls || 0,
          revenueToday: todayStats?.revenue_cents || 0,
          unpaidInvoices: unpaid.length,
          unpaidAmount: unpaidTotal
        }

        setStats(aggregated)
      } catch (err) {
        console.error('Error loading stats:', err)
        toast.error('Failed to load stats', {
          description: 'Check your connection and try again',
          action: {
            label: 'Retry',
            onClick: () => loadStats()
          }
        })
      } finally {
        setLoading(false)
      }
    }

    loadStats()

    // Subscribe to real-time updates
    const subscription = subscribeToStats(businessId, () => {
      loadStats() // Reload all stats when changes occur
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [businessId])

  // Calculate week over week change
  const calculateChange = () => {
    if (recentStats.length < 2) return null
    const thisWeek = recentStats.slice(0, 3).reduce((sum, s) => sum + s.new_leads, 0)
    const lastWeek = recentStats.slice(3, 6).reduce((sum, s) => sum + s.new_leads, 0)
    if (lastWeek === 0) return thisWeek > 0 ? '+100%' : null
    const change = ((thisWeek - lastWeek) / lastWeek * 100).toFixed(0)
    return Number(change) >= 0 ? `+${change}%` : `${change}%`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'New Leads',
      value: String(stats?.newLeads || 0),
      change: calculateChange(),
      icon: Users,
      bg: 'bg-emerald-600/20',
      text: 'text-emerald-400',
      tooltip: 'New contacts who messaged you today'
    },
    {
      label: 'Messages',
      value: String((stats?.messagesSent || 0) + (stats?.messagesReceived || 0)),
      subtext: 'AI handled',
      icon: MessageSquare,
      bg: 'bg-blue-600/20',
      text: 'text-blue-400',
      tooltip: 'Total SMS messages sent and received today'
    },
    {
      label: 'Revenue Today',
      value: '$' + ((stats?.revenueToday || 0) / 100).toLocaleString(),
      icon: DollarSign,
      bg: 'bg-green-600/20',
      text: 'text-green-400',
      tooltip: 'Invoices paid today'
    },
    {
      label: 'Missed Calls',
      value: String(stats?.missedCalls || 0),
      subtext: 'Recovered',
      icon: Phone,
      bg: 'bg-orange-600/20',
      text: 'text-orange-400',
      tooltip: 'Calls that went to voicemail - AI sent follow-up SMS'
    },
    {
      label: 'Unpaid',
      value: String(stats?.unpaidInvoices || 0),
      subtext: '$' + ((stats?.unpaidAmount || 0) / 100).toLocaleString() + ' total',
      icon: Clock,
      bg: 'bg-red-600/20',
      text: 'text-red-400',
      tooltip: 'Outstanding invoices awaiting payment'
    },
    {
      label: 'Response Time',
      value: '< 60s',
      icon: TrendingUp,
      bg: 'bg-purple-600/20',
      text: 'text-purple-400',
      tooltip: 'Average AI response time to customer messages'
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div
              key={i}
              className="stat-card bg-ghost-card border border-ghost-border rounded-2xl p-4 md:p-6 animate-fade-in-up"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className={"w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center " + stat.bg + " " + stat.text}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex items-center gap-2">
                  {stat.change && <span className="text-xs md:text-sm font-medium text-emerald-400">{stat.change}</span>}
                  <Tooltip content={stat.tooltip} position="left">
                    <Info className="w-4 h-4 text-ghost-muted hover:text-white cursor-help transition-colors" />
                  </Tooltip>
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-ghost-muted">{stat.label}</div>
              {stat.subtext && <div className="text-xs text-ghost-muted mt-1">{stat.subtext}</div>}
            </div>
          )
        })}
      </div>

      {/* Recent stats chart placeholder - shows last 7 days */}
      {recentStats.length > 0 && (
        <div className="bg-ghost-card border border-ghost-border rounded-2xl p-4 md:p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Last 7 Days</h2>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {recentStats.slice(0, 7).reverse().map((day, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] md:text-xs text-ghost-muted mb-2">
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'narrow' })}
                  <span className="hidden md:inline">
                    {new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).slice(1)}
                  </span>
                </div>
                <div className="h-16 md:h-20 bg-ghost-border rounded flex flex-col justify-end p-1">
                  <div
                    className="bg-emerald-500 rounded transition-all"
                    style={{ height: `${Math.min(100, (day.messages_sent + day.messages_received) * 2)}%` }}
                  />
                </div>
                <div className="text-[10px] md:text-xs text-ghost-muted mt-1">
                  {day.messages_sent + day.messages_received}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
