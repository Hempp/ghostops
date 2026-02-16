'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Heart,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageSquare,
  RefreshCw,
  Loader2,
  Search,
  X,
  DollarSign,
  Clock,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import type { CustomerHealthResult } from '@/lib/cofounder/intelligence'

interface CustomerHealthListProps {
  businessId: string
  onContactSelect?: (contactId: string) => void
}

interface CustomerWithHealth {
  id: string
  name: string | null
  phone: string
  email: string | null
  source: string | null
  createdAt: string
  health?: CustomerHealthResult
  loadingHealth?: boolean
}

const riskColors = {
  low: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  },
  medium: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  },
  high: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
}

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

const getScoreBg = (score: number) => {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

export default function CustomerHealthList({ businessId, onContactSelect }: CustomerHealthListProps) {
  const [customers, setCustomers] = useState<CustomerWithHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'recent'>('score')

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Use Supabase client-side for contacts
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: contacts, error: dbError } = await supabase
        .from('contacts')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (dbError) throw dbError

      const customersWithHealth: CustomerWithHealth[] = (contacts || []).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        source: c.source,
        createdAt: c.created_at
      }))

      setCustomers(customersWithHealth)

      // Auto-load health for top 10 customers
      const top10 = customersWithHealth.slice(0, 10)
      for (const customer of top10) {
        loadHealthScore(customer.id)
      }
    } catch (err) {
      console.error('Error fetching contacts:', err)
      setError('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const loadHealthScore = async (contactId: string) => {
    // Mark as loading
    setCustomers(prev =>
      prev.map(c =>
        c.id === contactId ? { ...c, loadingHealth: true } : c
      )
    )

    try {
      const response = await fetch(
        `/api/cofounder/insights?businessId=${businessId}&contactId=${contactId}`
      )

      if (!response.ok) throw new Error('Failed to fetch health score')

      const data = await response.json()

      setCustomers(prev =>
        prev.map(c =>
          c.id === contactId
            ? { ...c, health: data.healthScore, loadingHealth: false }
            : c
        )
      )
    } catch (err) {
      console.error('Error loading health score:', err)
      setCustomers(prev =>
        prev.map(c =>
          c.id === contactId ? { ...c, loadingHealth: false } : c
        )
      )
    }
  }

  const handleSendMessage = (customer: CustomerWithHealth) => {
    // Could integrate with conversation system
    toast.success(`Ready to message ${customer.name || customer.phone}`)
    if (onContactSelect) {
      onContactSelect(customer.id)
    }
  }

  const handleCall = (customer: CustomerWithHealth) => {
    window.location.href = `tel:${customer.phone}`
  }

  const handleEmail = (customer: CustomerWithHealth) => {
    if (customer.email) {
      window.location.href = `mailto:${customer.email}`
    }
  }

  // Filter and sort customers
  const filteredCustomers = customers
    .filter(c => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          c.name?.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          c.email?.toLowerCase().includes(query)
        )
      }
      return true
    })
    .filter(c => {
      // Risk filter
      if (filter === 'all') return true
      return c.health?.risk === filter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.health?.score || 50) - (a.health?.score || 50)
        case 'name':
          return (a.name || 'ZZZ').localeCompare(b.name || 'ZZZ')
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

  // Stats
  const healthyCount = customers.filter(c => c.health?.risk === 'low').length
  const atRiskCount = customers.filter(c => c.health?.risk === 'high').length
  const avgScore = customers.reduce((sum, c) => sum + (c.health?.score || 50), 0) / (customers.length || 1)

  if (loading) {
    return (
      <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Customer Health</h2>
            <p className="text-xs text-ghost-muted">Loading customers...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-ghost-accent animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Unable to load customers</p>
          <p className="text-ghost-muted text-sm mb-4">{error}</p>
          <button
            onClick={fetchContacts}
            className="px-4 py-2 bg-ghost-accent text-white rounded-lg hover:bg-ghost-accent/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-ghost-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Customer Health</h2>
              <p className="text-xs text-ghost-muted">
                {customers.length} customers tracked
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-emerald-400">{healthyCount}</p>
            <p className="text-[10px] text-ghost-muted">Healthy</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-red-400">{atRiskCount}</p>
            <p className="text-[10px] text-ghost-muted">At Risk</p>
          </div>
          <div className="bg-ghost-border rounded-lg p-2 text-center">
            <p className={`text-xl font-bold ${getScoreColor(avgScore)}`}>
              {Math.round(avgScore)}
            </p>
            <p className="text-[10px] text-ghost-muted">Avg Score</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ghost-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-10 pr-10 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white placeholder:text-ghost-muted text-sm focus:outline-none focus:border-ghost-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ghost-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="px-3 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white text-sm focus:outline-none focus:border-ghost-accent"
            >
              <option value="all">All Risk</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium</option>
              <option value="low">Low Risk</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white text-sm focus:outline-none focus:border-ghost-accent"
            >
              <option value="score">By Score</option>
              <option value="name">By Name</option>
              <option value="recent">Recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-ghost-muted mx-auto mb-4" />
            <p className="text-white font-medium mb-2">No customers found</p>
            <p className="text-ghost-muted text-sm">
              {searchQuery || filter !== 'all'
                ? 'Try adjusting your filters'
                : 'Customers will appear as they interact with your business'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ghost-border">
            {filteredCustomers.map(customer => {
              const colors = customer.health
                ? riskColors[customer.health.risk]
                : { bg: 'bg-ghost-border/30', border: 'border-ghost-border', text: 'text-ghost-muted', badge: '' }
              const isExpanded = expandedId === customer.id

              return (
                <div key={customer.id}>
                  <div
                    className={`p-4 hover:bg-ghost-border/30 transition-colors cursor-pointer ${colors.bg}`}
                    onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Score Circle */}
                      <div className="relative flex-shrink-0">
                        {customer.loadingHealth ? (
                          <div className="w-12 h-12 rounded-full border-2 border-ghost-border flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-ghost-muted animate-spin" />
                          </div>
                        ) : customer.health ? (
                          <div
                            className={`w-12 h-12 rounded-full border-2 ${colors.border} flex items-center justify-center relative`}
                          >
                            <span className={`text-lg font-bold ${colors.text}`}>
                              {customer.health.score}
                            </span>
                            {/* Progress ring */}
                            <svg className="absolute inset-0 w-12 h-12 -rotate-90">
                              <circle
                                cx="24"
                                cy="24"
                                r="21"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={`${getScoreColor(customer.health.score)} opacity-30`}
                              />
                              <circle
                                cx="24"
                                cy="24"
                                r="21"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeDasharray={`${customer.health.score * 1.32} 132`}
                                className={getScoreColor(customer.health.score)}
                              />
                            </svg>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              loadHealthScore(customer.id)
                            }}
                            className="w-12 h-12 rounded-full border-2 border-dashed border-ghost-border flex items-center justify-center hover:border-ghost-accent transition-colors group"
                          >
                            <RefreshCw className="w-5 h-5 text-ghost-muted group-hover:text-ghost-accent" />
                          </button>
                        )}
                      </div>

                      {/* Customer Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium truncate">
                            {customer.name || 'Unknown'}
                          </h3>
                          {customer.health && (
                            <span className={`px-2 py-0.5 text-[10px] uppercase font-medium rounded border ${colors.badge}`}>
                              {customer.health.risk}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-ghost-muted truncate">{customer.phone}</p>
                        {customer.source && (
                          <p className="text-xs text-ghost-muted">via {customer.source}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSendMessage(customer)
                          }}
                          className="p-2 text-ghost-muted hover:text-white hover:bg-ghost-border rounded-lg transition-colors"
                          title="Send message"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCall(customer)
                          }}
                          className="p-2 text-ghost-muted hover:text-white hover:bg-ghost-border rounded-lg transition-colors"
                          title="Call"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        {customer.email && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEmail(customer)
                            }}
                            className="p-2 text-ghost-muted hover:text-white hover:bg-ghost-border rounded-lg transition-colors"
                            title="Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-ghost-muted" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-ghost-muted" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && customer.health && (
                    <div className={`p-4 border-t ${colors.border} ${colors.bg}`}>
                      {/* Factors */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-white mb-2">Health Factors</h4>
                        <div className="space-y-2">
                          {customer.health.factors.map((factor, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-ghost-muted">{factor.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-ghost-muted">{factor.detail}</span>
                                <span className={`font-medium ${
                                  factor.impact >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {factor.impact >= 0 ? '+' : ''}{factor.impact}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="p-3 bg-ghost-bg rounded-lg">
                        <div className="flex items-start gap-2">
                          <TrendingUp className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.text}`} />
                          <div>
                            <p className="text-xs font-medium text-white mb-1">Recommended Action</p>
                            <p className="text-sm text-ghost-muted">{customer.health.recommendation}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {customer.health.risk !== 'low' && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleSendMessage(customer)}
                            className="flex-1 py-2 bg-ghost-accent text-white text-sm rounded-lg hover:bg-ghost-accent/80 transition-colors"
                          >
                            Re-engage Now
                          </button>
                          <button
                            onClick={() => loadHealthScore(customer.id)}
                            className="px-4 py-2 border border-ghost-border text-white text-sm rounded-lg hover:bg-ghost-border transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
