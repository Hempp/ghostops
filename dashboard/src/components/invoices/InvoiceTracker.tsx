'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Clock, CheckCircle, AlertTriangle, Send, Eye, ExternalLink, Search } from 'lucide-react'
import { toast } from 'sonner'
import { getInvoices, subscribeToInvoices, type Invoice } from '@/lib/supabase'
import { StatCardSkeleton, InvoiceRowSkeleton } from '@/components/ui/Skeleton'

interface InvoiceTrackerProps {
  businessId: string
}

export default function InvoiceTracker({ businessId }: InvoiceTrackerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getInvoices(businessId)
        setInvoices(data)
      } catch (err) {
        console.error('Error loading invoices:', err)
        toast.error('Failed to load invoices', {
          description: 'Check your connection and try again',
          action: {
            label: 'Retry',
            onClick: () => load()
          }
        })
      } finally {
        setLoading(false)
      }
    }

    load()

    // Subscribe to real-time updates
    const subscription = subscribeToInvoices(businessId, (updated) => {
      setInvoices(prev => {
        const exists = prev.find(i => i.id === updated.id)
        if (exists) {
          return prev.map(i => i.id === updated.id ? { ...i, ...updated } : i)
        }
        return [updated, ...prev]
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [businessId])

  const filtered = invoices.filter(inv => {
    // Apply status filter
    if (filter === 'unpaid' && inv.status === 'paid') return false
    if (filter === 'paid' && inv.status !== 'paid') return false

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const name = inv.contact_name?.toLowerCase() || ''
      const phone = inv.contact_phone?.toLowerCase() || ''
      const description = inv.description?.toLowerCase() || ''
      return name.includes(query) || phone.includes(query) || description.includes(query)
    }

    return true
  })

  const totalUnpaid = invoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + i.amount_cents, 0)

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.amount_cents, 0)

  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-600/20 text-gray-400',
      sent: 'bg-blue-600/20 text-blue-400',
      viewed: 'bg-yellow-600/20 text-yellow-400',
      paid: 'bg-emerald-600/20 text-emerald-400',
      overdue: 'bg-red-600/20 text-red-400',
    }
    return styles[status] || styles.draft
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-3 h-3" />
      case 'viewed': return <Eye className="w-3 h-3" />
      case 'overdue': return <AlertTriangle className="w-3 h-3" />
      case 'sent': return <Send className="w-3 h-3" />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ghost-border">
                <th className="text-left p-4 text-ghost-muted font-medium">Customer</th>
                <th className="text-left p-4 text-ghost-muted font-medium">Description</th>
                <th className="text-left p-4 text-ghost-muted font-medium">Amount</th>
                <th className="text-left p-4 text-ghost-muted font-medium">Status</th>
                <th className="text-left p-4 text-ghost-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <InvoiceRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-orange-400" />
            <span className="text-ghost-muted">Unpaid</span>
          </div>
          <div className="text-2xl font-bold text-white">
            ${(totalUnpaid / 100).toLocaleString()}
          </div>
          <div className="text-xs text-ghost-muted mt-1">
            {invoices.filter(i => i.status !== 'paid').length} invoices
          </div>
        </div>

        <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-ghost-muted">Paid</span>
          </div>
          <div className="text-2xl font-bold text-white">
            ${(totalPaid / 100).toLocaleString()}
          </div>
          <div className="text-xs text-ghost-muted mt-1">
            {invoices.filter(i => i.status === 'paid').length} invoices
          </div>
        </div>

        <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-ghost-muted">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-white">{overdueCount}</div>
          <div className="text-xs text-ghost-muted mt-1">
            Need follow-up
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'unpaid', 'paid'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors " +
                (filter === f
                  ? "bg-emerald-600 text-white"
                  : "bg-ghost-card text-ghost-muted hover:bg-ghost-border")
              }
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-muted" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-ghost-card border border-ghost-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Invoices - Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-ghost-card border border-ghost-border rounded-2xl p-8 text-center text-ghost-muted">
            {searchQuery
              ? `No invoices matching "${searchQuery}"`
              : 'No invoices found. Invoices created via SMS will appear here.'}
          </div>
        ) : (
          filtered.map((inv) => (
            <div key={inv.id} className="bg-ghost-card border border-ghost-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-white font-medium">{inv.contact_name || 'Unknown'}</div>
                  <div className="text-ghost-muted text-sm">{inv.contact_phone}</div>
                </div>
                <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap " + getStatusBadge(inv.status)}>
                  {getStatusIcon(inv.status)}
                  {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                </span>
              </div>
              <div className="text-ghost-muted text-sm mb-2 line-clamp-1">
                {inv.description || 'No description'}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold text-white">
                  ${(inv.amount_cents / 100).toFixed(2)}
                </div>
                <div className="text-ghost-muted text-xs">
                  {inv.sent_at
                    ? new Date(inv.sent_at).toLocaleDateString()
                    : new Date(inv.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invoices - Desktop Table View */}
      <div className="hidden md:block bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-ghost-muted">
            {searchQuery
              ? `No invoices matching "${searchQuery}"`
              : 'No invoices found. Invoices created via SMS will appear here.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ghost-border">
                <th className="text-left p-4 text-ghost-muted font-medium">Customer</th>
                <th className="text-left p-4 text-ghost-muted font-medium">Description</th>
                <th className="text-left p-4 text-ghost-muted font-medium">Amount</th>
                <th className="text-left p-4 text-ghost-muted font-medium">Status</th>
                <th className="text-left p-4 text-ghost-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-ghost-border hover:bg-ghost-border/30 transition-colors">
                  <td className="p-4">
                    <div className="text-white font-medium">
                      {inv.contact_name || 'Unknown'}
                    </div>
                    <div className="text-ghost-muted text-sm">
                      {inv.contact_phone}
                    </div>
                  </td>
                  <td className="p-4 text-ghost-muted">
                    {inv.description || 'No description'}
                  </td>
                  <td className="p-4 text-white font-medium">
                    ${(inv.amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="p-4">
                    <span className={"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap " + getStatusBadge(inv.status)}>
                      {getStatusIcon(inv.status)}
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4 text-ghost-muted text-sm">
                    {inv.sent_at
                      ? new Date(inv.sent_at).toLocaleDateString()
                      : new Date(inv.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
