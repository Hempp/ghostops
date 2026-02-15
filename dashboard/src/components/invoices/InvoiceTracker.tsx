'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Clock, CheckCircle, AlertTriangle, Send, Eye, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { getInvoices, subscribeToInvoices, type Invoice } from '@/lib/supabase'
import { StatCardSkeleton, InvoiceRowSkeleton } from '@/components/ui/Skeleton'

interface InvoiceTrackerProps {
  businessId: string
}

export default function InvoiceTracker({ businessId }: InvoiceTrackerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all')
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
    if (filter === 'all') return true
    if (filter === 'unpaid') return inv.status !== 'paid'
    return inv.status === 'paid'
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

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'unpaid', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors " +
              (filter === f
                ? "bg-emerald-600 text-white"
                : "bg-ghost-card text-ghost-muted hover:bg-ghost-border")
            }
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-ghost-muted">
            No invoices found. Invoices created via SMS will appear here.
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
                    <span className={"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium " + getStatusBadge(inv.status)}>
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
