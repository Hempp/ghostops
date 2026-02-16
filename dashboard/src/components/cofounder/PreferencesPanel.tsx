'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  Lightbulb,
  MessageSquare,
  Clock,
  DollarSign,
  Volume2,
  Zap,
  User,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface LearnedPreference {
  id: string
  businessId: string
  category: string
  preference: string
  confidence: number
  examples: string[]
  createdAt: Date
  updatedAt: Date
}

interface LearningInsight {
  category: string
  insight: string
  confidence: number
  basedOn: number
}

interface PreferencesPanelProps {
  businessId: string
}

const CATEGORY_ICONS: Record<string, typeof MessageSquare> = {
  communication_style: MessageSquare,
  timing: Clock,
  pricing: DollarSign,
  tone: Volume2,
  urgency_threshold: Zap,
  follow_up_frequency: RefreshCw,
  response_length: MessageSquare,
  formality: User,
  automation_level: Settings,
  overall_alignment: TrendingUp
}

const CATEGORY_LABELS: Record<string, string> = {
  communication_style: 'Communication Style',
  timing: 'Timing',
  pricing: 'Pricing',
  tone: 'Tone',
  urgency_threshold: 'Urgency Level',
  follow_up_frequency: 'Follow-up Frequency',
  response_length: 'Response Length',
  formality: 'Formality',
  automation_level: 'Automation Level',
  overall_alignment: 'Overall Alignment'
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  communication_style: 'How the AI communicates with customers',
  timing: 'When to send messages and follow-ups',
  pricing: 'Pricing strategies and discount behavior',
  tone: 'The emotional tone of messages',
  urgency_threshold: 'How to handle urgent situations',
  follow_up_frequency: 'How often to follow up with leads',
  response_length: 'Length of AI responses',
  formality: 'Level of formality in communication',
  automation_level: 'How much to automate vs. ask for approval'
}

export default function PreferencesPanel({ businessId }: PreferencesPanelProps) {
  const [preferences, setPreferences] = useState<LearnedPreference[]>([])
  const [insights, setInsights] = useState<LearningInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch preferences and insights in parallel
      const [prefsResponse, insightsResponse] = await Promise.all([
        fetch(`/api/cofounder/memory?businessId=${businessId}&include=preferences`),
        fetch(`/api/cofounder/memory?businessId=${businessId}&include=insights`)
      ])

      if (!prefsResponse.ok || !insightsResponse.ok) {
        throw new Error('Failed to fetch learning data')
      }

      const prefsData = await prefsResponse.json()
      const insightsData = await insightsResponse.json()

      setPreferences(prefsData.preferences.map((p: LearnedPreference & { createdAt: string; updatedAt: string }) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      })))
      setInsights(insightsData.insights)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load learning data')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleForgetPreference = async (preferenceId: string) => {
    setDeletingId(preferenceId)

    try {
      // We would need a DELETE endpoint, for now we'll update local state
      // In production, call: DELETE /api/cofounder/memory/preferences/${preferenceId}
      setPreferences(prev => prev.filter(p => p.id !== preferenceId))
    } catch (err) {
      console.error('Error deleting preference:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-emerald-400'
    if (confidence >= 0.5) return 'text-amber-400'
    return 'text-ghost-muted'
  }

  const getConfidenceBarColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-emerald-500'
    if (confidence >= 0.5) return 'bg-amber-500'
    return 'bg-ghost-muted'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence'
    if (confidence >= 0.5) return 'Medium Confidence'
    return 'Learning'
  }

  // Group preferences by category
  const preferencesByCategory = preferences.reduce((acc, pref) => {
    if (!acc[pref.category]) acc[pref.category] = []
    acc[pref.category].push(pref)
    return acc
  }, {} as Record<string, LearnedPreference[]>)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-ghost-muted">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading learned preferences...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <AlertCircle className="w-8 h-8 mb-4" />
        <p>{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-ghost-card border border-ghost-border rounded-lg hover:bg-ghost-border transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-ghost-border bg-ghost-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Learned Preferences</h2>
              <p className="text-xs text-ghost-muted">
                What your AI Co-Founder has learned about you
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg border border-ghost-border bg-ghost-bg text-ghost-muted hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Insights Section */}
        {insights.length > 0 && (
          <div className="p-4 border-b border-ghost-border">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-medium text-white">Learning Insights</h3>
            </div>

            <div className="space-y-2">
              {insights.slice(0, 5).map((insight, index) => {
                const Icon = CATEGORY_ICONS[insight.category] || Lightbulb

                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-ghost-bg rounded-lg"
                  >
                    <div className="w-6 h-6 bg-ghost-card rounded flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3 h-3 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{insight.insight}</p>
                      <p className="text-xs text-ghost-muted mt-1">
                        Based on {insight.basedOn} examples
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`text-xs ${getConfidenceColor(insight.confidence)}`}>
                        {(insight.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Preferences by Category */}
        {Object.keys(preferencesByCategory).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-ghost-muted p-4">
            <Sparkles className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-1">No preferences learned yet</p>
            <p className="text-sm text-center">
              As you provide feedback on AI decisions, your Co-Founder will learn your preferences
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ghost-border">
            {Object.entries(preferencesByCategory).map(([category, prefs]) => {
              const Icon = CATEGORY_ICONS[category] || Settings
              const isExpanded = expandedCategory === category
              const topPreference = prefs.sort((a, b) => b.confidence - a.confidence)[0]

              return (
                <div key={category} className="bg-ghost-card">
                  {/* Category Header */}
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category)}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-ghost-card/80 transition-colors"
                  >
                    <div className="w-8 h-8 bg-ghost-bg rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-amber-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white">
                        {CATEGORY_LABELS[category] || category}
                      </h4>
                      <p className="text-xs text-ghost-muted">
                        {CATEGORY_DESCRIPTIONS[category] || `${prefs.length} preferences`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Confidence indicator */}
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-ghost-bg rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getConfidenceBarColor(topPreference.confidence)}`}
                            style={{ width: `${topPreference.confidence * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs ${getConfidenceColor(topPreference.confidence)}`}>
                          {(topPreference.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-ghost-muted" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-ghost-muted" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Preferences */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="ml-11 space-y-2">
                        {prefs
                          .sort((a, b) => b.confidence - a.confidence)
                          .map((pref) => {
                            const isAvoidance = pref.preference.startsWith('avoid:')
                            const displayPref = isAvoidance
                              ? pref.preference.replace('avoid:', '')
                              : pref.preference

                            return (
                              <div
                                key={pref.id}
                                className="flex items-start gap-3 p-3 bg-ghost-bg rounded-lg group"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {isAvoidance ? (
                                      <span className="text-xs px-1.5 py-0.5 bg-red-600/20 text-red-400 rounded">
                                        AVOID
                                      </span>
                                    ) : (
                                      <span className="text-xs px-1.5 py-0.5 bg-emerald-600/20 text-emerald-400 rounded">
                                        PREFER
                                      </span>
                                    )}
                                    <span className="text-sm text-white">{displayPref}</span>
                                  </div>

                                  <div className="flex items-center gap-4 text-xs text-ghost-muted">
                                    <span className={getConfidenceColor(pref.confidence)}>
                                      {getConfidenceLabel(pref.confidence)}
                                    </span>
                                    <span>
                                      {pref.examples.length} example{pref.examples.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>

                                  {/* Show examples if available */}
                                  {pref.examples.length > 0 && (
                                    <div className="mt-2 text-xs text-ghost-muted">
                                      <p className="italic truncate">
                                        "{pref.examples[0].substring(0, 100)}..."
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Confidence bar */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="w-12 h-1.5 bg-ghost-card rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${getConfidenceBarColor(pref.confidence)}`}
                                      style={{ width: `${pref.confidence * 100}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Forget button */}
                                <button
                                  onClick={() => handleForgetPreference(pref.id)}
                                  disabled={deletingId === pref.id}
                                  className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-600/20 text-ghost-muted hover:text-red-400 transition-all disabled:opacity-50"
                                  title="Forget this preference"
                                >
                                  {deletingId === pref.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {preferences.length > 0 && (
        <div className="p-4 border-t border-ghost-border bg-ghost-card">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-white">{preferences.length}</p>
              <p className="text-xs text-ghost-muted">Preferences</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {Object.keys(preferencesByCategory).length}
              </p>
              <p className="text-xs text-ghost-muted">Categories</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-emerald-400">
                {preferences.filter(p => p.confidence >= 0.5).length}
              </p>
              <p className="text-xs text-ghost-muted">Confident</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
