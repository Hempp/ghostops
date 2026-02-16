'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import type { GoalProgressResult } from '@/lib/cofounder/intelligence'

interface GoalTrackerProps {
  businessId: string
}

interface GoalForm {
  name: string
  description: string
  metricType: 'revenue' | 'leads' | 'messages' | 'custom'
  targetValue: number
  unit: string
  deadline: string
}

const defaultGoalForm: GoalForm = {
  name: '',
  description: '',
  metricType: 'custom',
  targetValue: 0,
  unit: '',
  deadline: ''
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus
}

const trendColors = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  stable: 'text-gray-400'
}

export default function GoalTracker({ businessId }: GoalTrackerProps) {
  const [goals, setGoals] = useState<GoalProgressResult['goals']>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [overallHealth, setOverallHealth] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [goalForm, setGoalForm] = useState<GoalForm>(defaultGoalForm)
  const [suggestedGoals, setSuggestedGoals] = useState<any[]>([])

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/cofounder/goals?businessId=${businessId}&includeProgress=true`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch goals')
      }

      const data = await response.json()

      if (data.progress) {
        setGoals(data.progress.goals || [])
        setRecommendations(data.progress.recommendations || [])
        setOverallHealth(data.progress.overallHealth || 0)
      } else {
        setGoals([])
      }

      if (data.suggestedGoals) {
        setSuggestedGoals(data.suggestedGoals)
      }
    } catch (err) {
      console.error('Error fetching goals:', err)
      setError('Failed to load goals')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goalForm.name || goalForm.targetValue <= 0) {
      toast.error('Please provide a goal name and target value')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/cofounder/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name: goalForm.name,
          description: goalForm.description,
          metricType: goalForm.metricType,
          targetValue: goalForm.targetValue,
          unit: goalForm.unit,
          deadline: goalForm.deadline || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.migration) {
          toast.error('Goals feature needs setup', {
            description: 'Database migration required'
          })
        } else {
          throw new Error(data.error || 'Failed to create goal')
        }
        return
      }

      toast.success('Goal created!', {
        description: `"${goalForm.name}" has been added`
      })

      setShowAddModal(false)
      setGoalForm(defaultGoalForm)
      fetchGoals()
    } catch (err) {
      console.error('Error creating goal:', err)
      toast.error('Failed to create goal')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateProgress = async (goalId: string, currentValue: number) => {
    try {
      const response = await fetch('/api/cofounder/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          businessId,
          currentValue
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update goal')
      }

      fetchGoals()
      toast.success('Progress updated')
    } catch (err) {
      console.error('Error updating goal:', err)
      toast.error('Failed to update progress')
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to archive this goal?')) return

    try {
      const response = await fetch(
        `/api/cofounder/goals?goalId=${goalId}&businessId=${businessId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete goal')
      }

      toast.success('Goal archived')
      fetchGoals()
    } catch (err) {
      console.error('Error deleting goal:', err)
      toast.error('Failed to archive goal')
    }
  }

  const handleUseSuggested = (suggested: any) => {
    setGoalForm({
      name: suggested.name,
      description: suggested.description,
      metricType: suggested.metricType,
      targetValue: suggested.suggestedTarget,
      unit: suggested.unit,
      deadline: ''
    })
    setShowAddModal(true)
  }

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'bg-emerald-500'
    if (percent >= 50) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  const getHealthColor = (health: number) => {
    if (health >= 70) return 'text-emerald-400'
    if (health >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Goal Tracker</h2>
            <p className="text-xs text-ghost-muted">Loading goals...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-ghost-accent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-ghost-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Goal Tracker</h2>
                <p className="text-xs text-ghost-muted">
                  {goals.length > 0
                    ? `Overall health: `
                    : 'Set goals to track your progress'}
                  {goals.length > 0 && (
                    <span className={getHealthColor(overallHealth)}>
                      {overallHealth}%
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-3 py-2 bg-ghost-accent text-white text-sm rounded-lg hover:bg-ghost-accent/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Goal
            </button>
          </div>
        </div>

        {/* Goals List */}
        <div className="p-4 space-y-4">
          {goals.length === 0 && suggestedGoals.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-ghost-muted">Suggested goals for your business:</p>
              {suggestedGoals.map((suggested, index) => (
                <button
                  key={index}
                  onClick={() => handleUseSuggested(suggested)}
                  className="w-full p-3 border border-ghost-border border-dashed rounded-xl text-left hover:bg-ghost-border/30 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium group-hover:text-ghost-accent">
                        {suggested.name}
                      </p>
                      <p className="text-xs text-ghost-muted">{suggested.description}</p>
                    </div>
                    <div className="text-ghost-muted group-hover:text-ghost-accent">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {goals.length === 0 && suggestedGoals.length === 0 && (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-ghost-muted mx-auto mb-4" />
              <p className="text-white font-medium mb-2">No goals yet</p>
              <p className="text-ghost-muted text-sm mb-4">
                Create your first goal to start tracking progress
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-ghost-accent text-white rounded-lg hover:bg-ghost-accent/80 transition-colors"
              >
                Create Goal
              </button>
            </div>
          )}

          {goals.map(goal => {
            const TrendIcon = trendIcons[goal.trend]
            const isComplete = goal.percentComplete >= 100
            const isSuggested = goal.id.startsWith('suggested-')

            return (
              <div
                key={goal.id}
                className={`p-4 rounded-xl border ${
                  isComplete
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-ghost-border/30 border-ghost-border'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium">{goal.name}</h3>
                      {isComplete && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      {isSuggested && (
                        <span className="px-2 py-0.5 text-[10px] bg-ghost-accent/20 text-ghost-accent rounded">
                          Suggested
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-ghost-muted">
                        {goal.unit === '$' ? '$' : ''}{goal.current.toLocaleString()}{goal.unit !== '$' ? ` ${goal.unit}` : ''}
                        <span className="text-ghost-muted/60"> / </span>
                        {goal.unit === '$' ? '$' : ''}{goal.target.toLocaleString()}{goal.unit !== '$' ? ` ${goal.unit}` : ''}
                      </span>
                      <div className={`flex items-center gap-1 ${trendColors[goal.trend]}`}>
                        <TrendIcon className="w-4 h-4" />
                        <span className="text-xs capitalize">{goal.trend}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${
                      isComplete ? 'text-emerald-400' : 'text-white'
                    }`}>
                      {goal.percentComplete}%
                    </span>
                    {!isSuggested && (
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1 text-ghost-muted hover:text-red-400 transition-colors"
                        title="Archive goal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-ghost-border rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(goal.percentComplete)} transition-all duration-500`}
                    style={{ width: `${Math.min(100, goal.percentComplete)}%` }}
                  />
                </div>

                {/* Quick Update (for custom goals only) */}
                {!isSuggested && goal.id && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-ghost-muted">Quick update:</span>
                    <div className="flex gap-1">
                      {[25, 50, 75, 100].map(percent => {
                        const value = Math.round(goal.target * (percent / 100))
                        return (
                          <button
                            key={percent}
                            onClick={() => handleUpdateProgress(goal.id, value)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              goal.percentComplete >= percent
                                ? 'bg-ghost-accent/20 text-ghost-accent'
                                : 'bg-ghost-border text-ghost-muted hover:text-white'
                            }`}
                          >
                            {percent}%
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-4 border-t border-ghost-border bg-purple-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-white">AI Recommendations</h3>
            </div>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-ghost-muted">
                  <ChevronRight className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-ghost-card border border-ghost-border rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-ghost-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Create New Goal</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setGoalForm(defaultGoalForm)
                }}
                className="p-1 text-ghost-muted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-ghost-muted mb-1">Goal Name</label>
                <input
                  type="text"
                  value={goalForm.name}
                  onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Monthly Revenue Target"
                  className="w-full px-3 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white placeholder:text-ghost-muted focus:outline-none focus:border-ghost-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-ghost-muted mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={goalForm.description}
                  onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this goal"
                  className="w-full px-3 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white placeholder:text-ghost-muted focus:outline-none focus:border-ghost-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-ghost-muted mb-1">Metric Type</label>
                  <select
                    value={goalForm.metricType}
                    onChange={e => setGoalForm(f => ({ ...f, metricType: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white focus:outline-none focus:border-ghost-accent"
                  >
                    <option value="custom">Custom</option>
                    <option value="revenue">Revenue</option>
                    <option value="leads">Leads</option>
                    <option value="messages">Messages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-ghost-muted mb-1">Unit</label>
                  <input
                    type="text"
                    value={goalForm.unit}
                    onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="$ / leads / %"
                    className="w-full px-3 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white placeholder:text-ghost-muted focus:outline-none focus:border-ghost-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-ghost-muted mb-1">Target Value</label>
                  <input
                    type="number"
                    value={goalForm.targetValue || ''}
                    onChange={e => setGoalForm(f => ({ ...f, targetValue: Number(e.target.value) }))}
                    placeholder="5000"
                    min="1"
                    className="w-full px-3 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white placeholder:text-ghost-muted focus:outline-none focus:border-ghost-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-ghost-muted mb-1">Deadline (optional)</label>
                  <input
                    type="date"
                    value={goalForm.deadline}
                    onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full px-3 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white focus:outline-none focus:border-ghost-accent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setGoalForm(defaultGoalForm)
                  }}
                  className="flex-1 px-4 py-2 border border-ghost-border text-white rounded-lg hover:bg-ghost-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-ghost-accent text-white rounded-lg hover:bg-ghost-accent/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Goal'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
