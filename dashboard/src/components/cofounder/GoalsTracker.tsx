'use client'

import { useState, useEffect } from 'react'
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  Star,
  Clock,
  Award,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Circle
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface Goal {
  id: string
  name: string
  description: string
  category: 'revenue' | 'customers' | 'operations' | 'growth'
  type: 'number' | 'currency' | 'percentage' | 'time'
  currentValue: number
  targetValue: number
  startValue: number
  unit?: string
  deadline: Date
  createdAt: Date
  status: 'on_track' | 'at_risk' | 'behind' | 'completed'
  milestones?: {
    id: string
    label: string
    value: number
    reached: boolean
  }[]
}

interface GoalsTrackerProps {
  businessId: string
}

// Mock data generator
const generateGoals = (): Goal[] => {
  const now = new Date()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const endOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0)

  return [
    {
      id: '1',
      name: 'Monthly Revenue',
      description: 'Total revenue for February 2026',
      category: 'revenue',
      type: 'currency',
      currentValue: 18500,
      targetValue: 25000,
      startValue: 0,
      deadline: endOfMonth,
      createdAt: new Date(now.getFullYear(), now.getMonth(), 1),
      status: 'on_track',
      milestones: [
        { id: 'm1', label: 'Week 1', value: 6250, reached: true },
        { id: 'm2', label: 'Week 2', value: 12500, reached: true },
        { id: 'm3', label: 'Week 3', value: 18750, reached: false },
        { id: 'm4', label: 'Week 4', value: 25000, reached: false }
      ]
    },
    {
      id: '2',
      name: 'New Customers',
      description: 'New paying customers this month',
      category: 'customers',
      type: 'number',
      currentValue: 12,
      targetValue: 20,
      startValue: 0,
      deadline: endOfMonth,
      createdAt: new Date(now.getFullYear(), now.getMonth(), 1),
      status: 'at_risk'
    },
    {
      id: '3',
      name: 'Response Time',
      description: 'Average first response time to inquiries',
      category: 'operations',
      type: 'time',
      currentValue: 47,
      targetValue: 60,
      startValue: 120,
      unit: 'seconds',
      deadline: endOfMonth,
      createdAt: new Date(now.getFullYear(), now.getMonth(), 1),
      status: 'completed'
    },
    {
      id: '4',
      name: 'Customer Retention',
      description: 'Percentage of customers who return',
      category: 'customers',
      type: 'percentage',
      currentValue: 78,
      targetValue: 85,
      startValue: 70,
      deadline: endOfQuarter,
      createdAt: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
      status: 'on_track'
    },
    {
      id: '5',
      name: 'Quarterly Revenue',
      description: 'Q1 2026 total revenue',
      category: 'revenue',
      type: 'currency',
      currentValue: 52000,
      targetValue: 75000,
      startValue: 0,
      deadline: endOfQuarter,
      createdAt: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
      status: 'on_track',
      milestones: [
        { id: 'q1', label: 'Month 1', value: 25000, reached: true },
        { id: 'q2', label: 'Month 2', value: 50000, reached: true },
        { id: 'q3', label: 'Month 3', value: 75000, reached: false }
      ]
    },
    {
      id: '6',
      name: 'Lead Conversion Rate',
      description: 'Percentage of leads that become customers',
      category: 'growth',
      type: 'percentage',
      currentValue: 18,
      targetValue: 25,
      startValue: 15,
      deadline: endOfQuarter,
      createdAt: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
      status: 'behind'
    }
  ]
}

const getCategoryConfig = (category: Goal['category']) => {
  switch (category) {
    case 'revenue':
      return { icon: DollarSign, color: 'emerald', bg: 'bg-emerald-600/20', text: 'text-emerald-400' }
    case 'customers':
      return { icon: Users, color: 'blue', bg: 'bg-blue-600/20', text: 'text-blue-400' }
    case 'operations':
      return { icon: Clock, color: 'purple', bg: 'bg-purple-600/20', text: 'text-purple-400' }
    case 'growth':
      return { icon: TrendingUp, color: 'amber', bg: 'bg-amber-600/20', text: 'text-amber-400' }
  }
}

const getStatusConfig = (status: Goal['status']) => {
  switch (status) {
    case 'on_track':
      return { icon: TrendingUp, color: 'emerald', bg: 'bg-emerald-600/20', text: 'text-emerald-400', label: 'On Track' }
    case 'at_risk':
      return { icon: AlertCircle, color: 'amber', bg: 'bg-amber-600/20', text: 'text-amber-400', label: 'At Risk' }
    case 'behind':
      return { icon: TrendingDown, color: 'red', bg: 'bg-red-600/20', text: 'text-red-400', label: 'Behind' }
    case 'completed':
      return { icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-600/20', text: 'text-emerald-400', label: 'Completed' }
  }
}

const formatValue = (value: number, type: Goal['type'], unit?: string): string => {
  switch (type) {
    case 'currency':
      return `$${value.toLocaleString()}`
    case 'percentage':
      return `${value}%`
    case 'time':
      return `${value}${unit ? ` ${unit}` : 's'}`
    default:
      return value.toLocaleString()
  }
}

const calculateProgress = (goal: Goal): number => {
  // For "time" goals where lower is better
  if (goal.type === 'time') {
    const totalReduction = goal.startValue - goal.targetValue
    const currentReduction = goal.startValue - goal.currentValue
    return Math.min(100, Math.max(0, (currentReduction / totalReduction) * 100))
  }
  // For other goals where higher is better
  const range = goal.targetValue - goal.startValue
  const progress = goal.currentValue - goal.startValue
  return Math.min(100, Math.max(0, (progress / range) * 100))
}

const getDaysRemaining = (deadline: Date): number => {
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function GoalCard({
  goal,
  onEdit,
  onDelete
}: {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
}) {
  const categoryConfig = getCategoryConfig(goal.category)
  const statusConfig = getStatusConfig(goal.status)
  const CategoryIcon = categoryConfig.icon
  const StatusIcon = statusConfig.icon
  const progress = calculateProgress(goal)
  const daysRemaining = getDaysRemaining(goal.deadline)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-ghost-border bg-ghost-card rounded-xl overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-ghost-card/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${categoryConfig.bg}`}>
            <CategoryIcon className={`w-5 h-5 ${categoryConfig.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="text-sm font-medium text-white">{goal.name}</h4>
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-ghost-muted mb-3">{goal.description}</p>

            {/* Progress bar */}
            <div className="relative">
              <div className="h-2 bg-ghost-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    goal.status === 'completed' ? 'bg-emerald-500' :
                    goal.status === 'behind' ? 'bg-red-500' :
                    goal.status === 'at_risk' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {goal.milestones && (
                <div className="absolute top-0 left-0 right-0 h-2 flex">
                  {goal.milestones.map((milestone, i) => {
                    const position = ((milestone.value - goal.startValue) / (goal.targetValue - goal.startValue)) * 100
                    return (
                      <div
                        key={milestone.id}
                        className="absolute top-1/2 -translate-y-1/2"
                        style={{ left: `${position}%` }}
                      >
                        <div className={`w-2 h-2 rounded-full border-2 ${
                          milestone.reached
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'bg-ghost-card border-ghost-border'
                        }`} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-semibold text-white">
                {formatValue(goal.currentValue, goal.type, goal.unit)}
              </span>
              <span className="text-xs text-ghost-muted">
                of {formatValue(goal.targetValue, goal.type, goal.unit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-ghost-border/50">
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-ghost-bg/50 rounded-lg p-3">
              <div className="text-xs text-ghost-muted mb-1">Progress</div>
              <div className="text-lg font-semibold text-white">{Math.round(progress)}%</div>
            </div>
            <div className="bg-ghost-bg/50 rounded-lg p-3">
              <div className="text-xs text-ghost-muted mb-1">Days Remaining</div>
              <div className="text-lg font-semibold text-white">{daysRemaining}</div>
            </div>
          </div>

          {goal.milestones && goal.milestones.length > 0 && (
            <div className="mt-4">
              <h5 className="text-xs text-ghost-muted mb-2 uppercase tracking-wide">Milestones</h5>
              <div className="space-y-2">
                {goal.milestones.map(milestone => (
                  <div key={milestone.id} className="flex items-center gap-2">
                    {milestone.reached ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-ghost-muted" />
                    )}
                    <span className={`text-sm ${milestone.reached ? 'text-ghost-text' : 'text-ghost-muted'}`}>
                      {milestone.label}: {formatValue(milestone.value, goal.type, goal.unit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-ghost-border/50">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-ghost-muted hover:text-white hover:bg-ghost-border rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-ghost-muted hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GoalsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-ghost-border bg-ghost-card rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="w-3/4 h-4 mb-2" />
              <Skeleton className="w-full h-3 mb-3" />
              <Skeleton className="w-full h-2 rounded-full mb-2" />
              <div className="flex justify-between">
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-16 h-4" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AddGoalModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (goal: Omit<Goal, 'id' | 'createdAt' | 'status'>) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Goal['category']>('revenue')
  const [type, setType] = useState<Goal['type']>('currency')
  const [currentValue, setCurrentValue] = useState(0)
  const [targetValue, setTargetValue] = useState(0)
  const [deadline, setDeadline] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({
      name,
      description,
      category,
      type,
      currentValue,
      targetValue,
      startValue: currentValue,
      deadline: new Date(deadline)
    })
    // Reset form
    setName('')
    setDescription('')
    setCategory('revenue')
    setType('currency')
    setCurrentValue(0)
    setTargetValue(0)
    setDeadline('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ghost-card border border-ghost-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-ghost-border">
          <h3 className="text-lg font-semibold text-white">Add New Goal</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-ghost-border rounded-lg transition-colors text-ghost-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-ghost-muted mb-1">Goal Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500"
              placeholder="e.g., Monthly Revenue"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-ghost-muted mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500"
              placeholder="Brief description of your goal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-ghost-muted mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Goal['category'])}
                className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="revenue">Revenue</option>
                <option value="customers">Customers</option>
                <option value="operations">Operations</option>
                <option value="growth">Growth</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-ghost-muted mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Goal['type'])}
                className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="currency">Currency ($)</option>
                <option value="number">Number</option>
                <option value="percentage">Percentage (%)</option>
                <option value="time">Time (seconds)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-ghost-muted mb-1">Current Value</label>
              <input
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(Number(e.target.value))}
                className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-ghost-muted mb-1">Target Value</label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
                className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-ghost-muted mb-1">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-ghost-border text-white rounded-lg hover:bg-ghost-border/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Add Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GoalsTracker({ businessId }: GoalsTrackerProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | Goal['category'] | Goal['status']>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadGoals()
  }, [businessId])

  const loadGoals = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      const data = generateGoals()
      setGoals(data)
    } catch (error) {
      console.error('Error loading goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadGoals()
    setRefreshing(false)
  }

  const handleAddGoal = (goalData: Omit<Goal, 'id' | 'createdAt' | 'status'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: `goal-${Date.now()}`,
      createdAt: new Date(),
      status: 'on_track'
    }
    setGoals(prev => [newGoal, ...prev])
  }

  const handleEditGoal = (id: string) => {
    console.log('Edit goal:', id)
  }

  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const filteredGoals = goals.filter(goal => {
    if (filter === 'all') return true
    if (['revenue', 'customers', 'operations', 'growth'].includes(filter)) {
      return goal.category === filter
    }
    return goal.status === filter
  })

  const filterOptions = [
    { value: 'all', label: 'All Goals' },
    { value: 'on_track', label: 'On Track' },
    { value: 'at_risk', label: 'At Risk' },
    { value: 'behind', label: 'Behind' },
    { value: 'completed', label: 'Completed' },
  ] as const

  // Summary stats
  const completedCount = goals.filter(g => g.status === 'completed').length
  const onTrackCount = goals.filter(g => g.status === 'on_track').length
  const atRiskCount = goals.filter(g => g.status === 'at_risk' || g.status === 'behind').length

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <Skeleton className="w-32 h-6 mb-2" />
          <Skeleton className="w-48 h-4" />
        </div>
        <GoalsSkeleton />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Goal Tracking
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-ghost-card rounded-lg transition-colors text-ghost-muted hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Goal
            </button>
          </div>
        </div>
        <p className="text-sm text-ghost-muted">
          {goals.length} goals tracked
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{completedCount}</div>
          <div className="text-xs text-ghost-muted">Completed</div>
        </div>
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{onTrackCount}</div>
          <div className="text-xs text-ghost-muted">On Track</div>
        </div>
        <div className="bg-amber-600/10 border border-amber-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{atRiskCount}</div>
          <div className="text-xs text-ghost-muted">Needs Attention</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              filter === option.value
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-ghost-card text-ghost-muted hover:text-white border border-ghost-border'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Goals List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-ghost-card rounded-full flex items-center justify-center mb-3">
              <Target className="w-6 h-6 text-ghost-muted" />
            </div>
            <p className="text-ghost-muted">No goals in this category</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add your first goal
            </button>
          </div>
        ) : (
          filteredGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => handleEditGoal(goal.id)}
              onDelete={() => handleDeleteGoal(goal.id)}
            />
          ))
        )}
      </div>

      {/* Add Goal Modal */}
      <AddGoalModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddGoal}
      />
    </div>
  )
}
