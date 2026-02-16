'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw,
  CheckCheck,
  Filter,
  History,
  Zap,
  Loader2,
  DollarSign,
  MessageSquare,
  Star,
  AlertTriangle,
  Calendar,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import ActionCard from './ActionCard'
import type { CoFounderAction, ActionType, ActionStatus } from '@/lib/cofounder/actions'

interface ActionQueueProps {
  businessId: string
}

interface ActionStats {
  pending: number
  approved: number
  executed: number
  rejected: number
  byType: Record<ActionType, number>
}

type ViewMode = 'pending' | 'approved' | 'history'

const TYPE_FILTERS: { value: ActionType | 'all'; label: string; icon: typeof DollarSign }[] = [
  { value: 'all', label: 'All Types', icon: Filter },
  { value: 'payment_reminder', label: 'Payments', icon: DollarSign },
  { value: 'lead_response', label: 'Leads', icon: MessageSquare },
  { value: 'review_reply', label: 'Reviews', icon: Star },
  { value: 'schedule_optimization', label: 'Schedule', icon: Calendar },
  { value: 'alert', label: 'Alerts', icon: AlertTriangle }
]

export default function ActionQueue({ businessId }: ActionQueueProps) {
  const [actions, setActions] = useState<CoFounderAction[]>([])
  const [stats, setStats] = useState<ActionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('pending')
  const [typeFilter, setTypeFilter] = useState<ActionType | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Fetch actions
  const fetchActions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)

    try {
      const statusMap: Record<ViewMode, ActionStatus | undefined> = {
        pending: 'pending',
        approved: 'approved',
        history: undefined // Will fetch executed and rejected
      }

      let status = statusMap[viewMode]

      // For history mode, we need to make two requests or use a different approach
      let url = `/api/cofounder/actions?businessId=${businessId}&includeStats=true`

      if (status) {
        url += `&status=${status}`
      }

      if (typeFilter !== 'all') {
        url += `&type=${typeFilter}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch actions')
      }

      const data = await response.json()

      // For history mode, fetch both executed and rejected
      if (viewMode === 'history') {
        const [executedRes, rejectedRes] = await Promise.all([
          fetch(`/api/cofounder/actions?businessId=${businessId}&status=executed${typeFilter !== 'all' ? `&type=${typeFilter}` : ''}`),
          fetch(`/api/cofounder/actions?businessId=${businessId}&status=rejected${typeFilter !== 'all' ? `&type=${typeFilter}` : ''}`)
        ])

        const executedData = await executedRes.json()
        const rejectedData = await rejectedRes.json()

        setActions([
          ...(executedData.actions || []),
          ...(rejectedData.actions || [])
        ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()))
      } else {
        setActions(data.actions || [])
      }

      if (data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching actions:', error)
      toast.error('Failed to load actions')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [businessId, viewMode, typeFilter])

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  // Handle approve
  const handleApprove = async (actionId: string) => {
    try {
      const response = await fetch('/api/cofounder/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, status: 'approved' })
      })

      if (!response.ok) throw new Error('Failed to approve')

      toast.success('Action approved')
      fetchActions()
    } catch (error) {
      toast.error('Failed to approve action')
    }
  }

  // Handle reject
  const handleReject = async (actionId: string) => {
    try {
      const response = await fetch('/api/cofounder/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, status: 'rejected' })
      })

      if (!response.ok) throw new Error('Failed to reject')

      toast.success('Action rejected')
      fetchActions()
    } catch (error) {
      toast.error('Failed to reject action')
    }
  }

  // Handle edit
  const handleEdit = async (actionId: string, newDetails: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/cofounder/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, status: 'pending', details: newDetails })
      })

      if (!response.ok) throw new Error('Failed to update')

      toast.success('Action updated')
      fetchActions()
    } catch (error) {
      toast.error('Failed to update action')
    }
  }

  // Handle execute
  const handleExecute = async (actionId: string) => {
    try {
      const response = await fetch('/api/cofounder/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId })
      })

      if (!response.ok) throw new Error('Failed to execute')

      const data = await response.json()

      if (data.result?.success) {
        toast.success('Action executed successfully')
      } else {
        toast.error(data.result?.message || 'Execution failed')
      }

      fetchActions()
    } catch (error) {
      toast.error('Failed to execute action')
    }
  }

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return

    setBulkLoading(true)
    try {
      const response = await fetch('/api/cofounder/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionIds: Array.from(selectedIds),
          status: 'approved'
        })
      })

      if (!response.ok) throw new Error('Failed to bulk approve')

      toast.success(`${selectedIds.size} actions approved`)
      setSelectedIds(new Set())
      fetchActions()
    } catch (error) {
      toast.error('Failed to approve actions')
    } finally {
      setBulkLoading(false)
    }
  }

  // Bulk execute
  const handleBulkExecute = async () => {
    setBulkLoading(true)
    try {
      const response = await fetch('/api/cofounder/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          executeAll: true
        })
      })

      if (!response.ok) throw new Error('Failed to execute')

      const data = await response.json()
      const successCount = data.results?.filter((r: { success: boolean }) => r.success).length || 0

      toast.success(`Executed ${successCount} actions`)
      fetchActions()
    } catch (error) {
      toast.error('Failed to execute actions')
    } finally {
      setBulkLoading(false)
    }
  }

  // Selection handlers
  const handleSelect = (actionId: string, selected: boolean) => {
    const newSelected = new Set(selectedIds)
    if (selected) {
      newSelected.add(actionId)
    } else {
      newSelected.delete(actionId)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === actions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(actions.map(a => a.id)))
    }
  }

  // Scan for new actions
  const handleScan = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/cofounder/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          type: 'scan_reminders'
        })
      })

      if (!response.ok) throw new Error('Scan failed')

      const data = await response.json()
      toast.success(data.message || 'Scan complete')
      fetchActions()
    } catch (error) {
      toast.error('Failed to scan for actions')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className={`bg-ghost-card border rounded-xl p-4 cursor-pointer transition-all ${
              viewMode === 'pending' ? 'border-emerald-500 bg-emerald-500/5' : 'border-ghost-border hover:border-ghost-border/80'
            }`}
            onClick={() => setViewMode('pending')}
          >
            <div className="text-2xl font-bold text-orange-400">{stats.pending}</div>
            <div className="text-sm text-ghost-muted">Pending Review</div>
          </div>
          <div
            className={`bg-ghost-card border rounded-xl p-4 cursor-pointer transition-all ${
              viewMode === 'approved' ? 'border-emerald-500 bg-emerald-500/5' : 'border-ghost-border hover:border-ghost-border/80'
            }`}
            onClick={() => setViewMode('approved')}
          >
            <div className="text-2xl font-bold text-emerald-400">{stats.approved}</div>
            <div className="text-sm text-ghost-muted">Ready to Execute</div>
          </div>
          <div
            className={`bg-ghost-card border rounded-xl p-4 cursor-pointer transition-all ${
              viewMode === 'history' ? 'border-emerald-500 bg-emerald-500/5' : 'border-ghost-border hover:border-ghost-border/80'
            }`}
            onClick={() => setViewMode('history')}
          >
            <div className="text-2xl font-bold text-blue-400">{stats.executed}</div>
            <div className="text-sm text-ghost-muted">Executed</div>
          </div>
          <div className="bg-ghost-card border border-ghost-border rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-400">{stats.rejected}</div>
            <div className="text-sm text-ghost-muted">Rejected</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-ghost-card text-ghost-muted hover:bg-ghost-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {viewMode === 'pending' && selectedIds.size > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {bulkLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Approve {selectedIds.size}
            </button>
          )}

          {viewMode === 'approved' && actions.length > 0 && (
            <button
              onClick={handleBulkExecute}
              disabled={bulkLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {bulkLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Execute All
            </button>
          )}

          <button
            onClick={handleScan}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-ghost-card border border-ghost-border text-ghost-text rounded-lg hover:bg-ghost-border transition-colors disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Scan
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex border-b border-ghost-border">
        <button
          onClick={() => setViewMode('pending')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            viewMode === 'pending'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-ghost-muted hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Needs Review
          {stats && stats.pending > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">
              {stats.pending}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode('approved')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            viewMode === 'approved'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-ghost-muted hover:text-white'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          Ready to Execute
          {stats && stats.approved > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
              {stats.approved}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            viewMode === 'history'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-ghost-muted hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Select All (for pending view) */}
      {viewMode === 'pending' && actions.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.size === actions.length && actions.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-ghost-border bg-ghost-bg text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm text-ghost-muted">
            {selectedIds.size === actions.length ? 'Deselect all' : 'Select all'}
          </span>
        </div>
      )}

      {/* Actions List */}
      <div className="space-y-4">
        {actions.length === 0 ? (
          <div className="bg-ghost-card border border-ghost-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-ghost-border/50 rounded-full flex items-center justify-center mx-auto mb-4">
              {viewMode === 'pending' ? (
                <CheckCheck className="w-8 h-8 text-emerald-400" />
              ) : viewMode === 'approved' ? (
                <Zap className="w-8 h-8 text-blue-400" />
              ) : (
                <History className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {viewMode === 'pending'
                ? 'All caught up!'
                : viewMode === 'approved'
                  ? 'No actions ready'
                  : 'No history yet'}
            </h3>
            <p className="text-ghost-muted text-sm max-w-md mx-auto">
              {viewMode === 'pending'
                ? 'No pending actions need your review. Click "Scan" to check for new opportunities.'
                : viewMode === 'approved'
                  ? 'Approve some pending actions to see them here.'
                  : 'Executed and rejected actions will appear here.'}
            </p>
          </div>
        ) : (
          actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={handleEdit}
              onExecute={viewMode === 'approved' ? handleExecute : undefined}
              isSelected={selectedIds.has(action.id)}
              onSelect={viewMode === 'pending' ? handleSelect : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}
