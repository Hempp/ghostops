'use client'

import { useEffect, useState } from 'react'
import { Users, MessageSquare, DollarSign, Phone, Clock, TrendingUp } from 'lucide-react'

interface StatsOverviewProps {
  businessId: string
}

export default function StatsOverview({ businessId }: StatsOverviewProps) {
  const statCards = [
    { label: 'New Leads', value: '4', change: '+25%', icon: Users, bg: 'bg-emerald-600/20', text: 'text-emerald-400' },
    { label: 'Messages', value: '83', subtext: 'AI handled', icon: MessageSquare, bg: 'bg-blue-600/20', text: 'text-blue-400' },
    { label: 'Revenue Today', value: '$3,200', icon: DollarSign, bg: 'bg-green-600/20', text: 'text-green-400' },
    { label: 'Missed Calls', value: '3', subtext: 'Recovered', icon: Phone, bg: 'bg-orange-600/20', text: 'text-orange-400' },
    { label: 'Unpaid', value: '2', subtext: '$1,250 total', icon: Clock, bg: 'bg-red-600/20', text: 'text-red-400' },
    { label: 'Response Time', value: '< 60s', icon: TrendingUp, bg: 'bg-purple-600/20', text: 'text-purple-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="stat-card bg-ghost-card border border-ghost-border rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={"w-12 h-12 rounded-xl flex items-center justify-center " + stat.bg + " " + stat.text}>
                  <Icon className="w-6 h-6" />
                </div>
                {stat.change && <span className="text-sm font-medium text-emerald-400">{stat.change}</span>}
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-ghost-muted">{stat.label}</div>
              {stat.subtext && <div className="text-xs text-ghost-muted mt-1">{stat.subtext}</div>}
            </div>
          )
        })}
      </div>
      
      <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { time: '2 min ago', text: 'AI responded to lead from Facebook', dot: 'bg-emerald-500' },
            { time: '5 min ago', text: 'Invoice #1234 marked as paid ($450)', dot: 'bg-green-500' },
            { time: '12 min ago', text: 'Missed call recovered - appointment booked', dot: 'bg-orange-500' },
            { time: '18 min ago', text: 'Review request sent to John D.', dot: 'bg-yellow-500' },
            { time: '25 min ago', text: 'Social post published to Instagram', dot: 'bg-purple-500' },
          ].map((activity, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <div className={"w-2 h-2 rounded-full " + activity.dot} />
              <span className="text-white flex-1">{activity.text}</span>
              <span className="text-ghost-muted text-sm">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
