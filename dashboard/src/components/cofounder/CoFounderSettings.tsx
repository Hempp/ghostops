'use client'

import { useState, useEffect } from 'react'
import {
  Settings,
  Bell,
  Brain,
  MessageSquare,
  Clock,
  Shield,
  Sliders,
  ChevronRight,
  Check,
  Info,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface NotificationSettings {
  dailyBriefing: boolean
  dailyBriefingTime: string
  weeklyReport: boolean
  weeklyReportDay: string
  actionAlerts: boolean
  opportunityAlerts: boolean
  riskAlerts: boolean
  emailNotifications: boolean
  pushNotifications: boolean
}

interface AutonomySettings {
  level: 'conservative' | 'balanced' | 'proactive'
  autoRespond: boolean
  autoSchedule: boolean
  autoFollowUp: boolean
  autoInvoiceReminders: boolean
  requireApproval: {
    spending: boolean
    spendingLimit: number
    messaging: boolean
    scheduling: boolean
  }
}

interface LearningPreferences {
  communicationStyle: 'formal' | 'casual' | 'adaptive'
  industryContext: string
  targetAudience: string
  brandVoice: string
  keyPhrases: string[]
  avoidPhrases: string[]
}

interface CoFounderSettingsData {
  notifications: NotificationSettings
  autonomy: AutonomySettings
  learning: LearningPreferences
  confidenceScore: number
  learningProgress: number
  lastUpdated: Date
}

interface CoFounderSettingsProps {
  businessId: string
}

// Mock initial data
const getInitialSettings = (): CoFounderSettingsData => ({
  notifications: {
    dailyBriefing: true,
    dailyBriefingTime: '08:00',
    weeklyReport: true,
    weeklyReportDay: 'monday',
    actionAlerts: true,
    opportunityAlerts: true,
    riskAlerts: true,
    emailNotifications: true,
    pushNotifications: false
  },
  autonomy: {
    level: 'balanced',
    autoRespond: true,
    autoSchedule: false,
    autoFollowUp: true,
    autoInvoiceReminders: true,
    requireApproval: {
      spending: true,
      spendingLimit: 100,
      messaging: false,
      scheduling: true
    }
  },
  learning: {
    communicationStyle: 'adaptive',
    industryContext: 'Home services / Contracting',
    targetAudience: 'Homeowners aged 35-65',
    brandVoice: 'Professional but friendly, knowledgeable, trustworthy',
    keyPhrases: ['quality workmanship', 'satisfaction guaranteed', 'free estimate'],
    avoidPhrases: ['cheap', 'quick fix']
  },
  confidenceScore: 87,
  learningProgress: 73,
  lastUpdated: new Date()
})

function SettingSection({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="border border-ghost-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-ghost-border bg-ghost-card/50">
        <h4 className="text-sm font-medium text-white">{title}</h4>
        {description && (
          <p className="text-xs text-ghost-muted mt-1">{description}</p>
        )}
      </div>
      <div className="p-4 space-y-4">
        {children}
      </div>
    </div>
  )
}

function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
  disabled = false
}: {
  label: string
  description?: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className={`text-sm ${disabled ? 'text-ghost-muted' : 'text-white'}`}>{label}</p>
        {description && (
          <p className="text-xs text-ghost-muted mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' :
          enabled ? 'bg-emerald-600' : 'bg-ghost-border'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function SelectSetting({
  label,
  description,
  value,
  options,
  onChange
}: {
  label: string
  description?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-sm text-white mb-1">{label}</label>
      {description && (
        <p className="text-xs text-ghost-muted mb-2">{description}</p>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function AutonomyLevelSelector({
  level,
  onChange
}: {
  level: AutonomySettings['level']
  onChange: (level: AutonomySettings['level']) => void
}) {
  const levels = [
    {
      value: 'conservative' as const,
      label: 'Conservative',
      description: 'AI suggests actions, you approve everything',
      icon: Shield
    },
    {
      value: 'balanced' as const,
      label: 'Balanced',
      description: 'AI handles routine tasks, asks for approval on important decisions',
      icon: Sliders
    },
    {
      value: 'proactive' as const,
      label: 'Proactive',
      description: 'AI acts autonomously within set boundaries',
      icon: Brain
    }
  ]

  return (
    <div className="space-y-3">
      {levels.map(l => {
        const Icon = l.icon
        const isSelected = level === l.value
        return (
          <button
            key={l.value}
            onClick={() => onChange(l.value)}
            className={`w-full p-4 rounded-xl border transition-all text-left ${
              isSelected
                ? 'border-emerald-500/50 bg-emerald-600/10'
                : 'border-ghost-border bg-ghost-card/50 hover:border-ghost-muted'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isSelected ? 'bg-emerald-600/20' : 'bg-ghost-border'
              }`}>
                <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-ghost-muted'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-ghost-text'}`}>
                    {l.label}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-ghost-muted mt-0.5">{l.description}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function TagInput({
  label,
  tags,
  onChange,
  placeholder
}: {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    if (input.trim() && !tags.includes(input.trim())) {
      onChange([...tags, input.trim()])
      setInput('')
    }
  }

  const handleRemove = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      <label className="block text-sm text-white mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-ghost-border rounded-lg text-xs text-ghost-text"
          >
            {tag}
            <button
              onClick={() => handleRemove(tag)}
              className="text-ghost-muted hover:text-white"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-2 bg-ghost-border text-white rounded-lg hover:bg-ghost-border/80 text-sm"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-ghost-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-ghost-border">
            <Skeleton className="w-32 h-5 mb-1" />
            <Skeleton className="w-48 h-3" />
          </div>
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div>
                  <Skeleton className="w-24 h-4 mb-1" />
                  <Skeleton className="w-40 h-3" />
                </div>
                <Skeleton className="w-11 h-6 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CoFounderSettings({ businessId }: CoFounderSettingsProps) {
  const [settings, setSettings] = useState<CoFounderSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [businessId])

  const loadSettings = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      const data = getInitialSettings()
      setSettings(data)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateNotifications = (updates: Partial<NotificationSettings>) => {
    if (!settings) return
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, ...updates }
    })
    setHasChanges(true)
  }

  const updateAutonomy = (updates: Partial<AutonomySettings>) => {
    if (!settings) return
    setSettings({
      ...settings,
      autonomy: { ...settings.autonomy, ...updates }
    })
    setHasChanges(true)
  }

  const updateLearning = (updates: Partial<LearningPreferences>) => {
    if (!settings) return
    setSettings({
      ...settings,
      learning: { ...settings.learning, ...updates }
    })
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <Skeleton className="w-32 h-6 mb-2" />
          <Skeleton className="w-48 h-4" />
        </div>
        <SettingsSkeleton />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-ghost-muted">Unable to load settings</p>
        <button
          onClick={loadSettings}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-ghost-muted" />
            Co-Founder Settings
          </h3>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          )}
        </div>
        <p className="text-sm text-ghost-muted">
          Configure how your AI Co-Founder works with you
        </p>
      </div>

      {/* Learning Progress Card */}
      <div className="mb-6 p-4 bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-white">Learning Progress</span>
          </div>
          <span className="text-lg font-bold text-purple-400">{settings.confidenceScore}%</span>
        </div>
        <div className="h-2 bg-ghost-border rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            style={{ width: `${settings.learningProgress}%` }}
          />
        </div>
        <p className="text-xs text-ghost-muted">
          Your Co-Founder has learned from {settings.learningProgress}% of your interactions
        </p>
      </div>

      {/* Settings Sections */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Autonomy Level */}
        <SettingSection
          title="Autonomy Level"
          description="How much independence should your Co-Founder have?"
        >
          <AutonomyLevelSelector
            level={settings.autonomy.level}
            onChange={(level) => updateAutonomy({ level })}
          />

          <div className="pt-4 border-t border-ghost-border space-y-4">
            <ToggleSetting
              label="Auto-respond to messages"
              description="AI responds to customer inquiries automatically"
              enabled={settings.autonomy.autoRespond}
              onChange={(autoRespond) => updateAutonomy({ autoRespond })}
            />
            <ToggleSetting
              label="Auto-schedule appointments"
              description="AI can book appointments on your calendar"
              enabled={settings.autonomy.autoSchedule}
              onChange={(autoSchedule) => updateAutonomy({ autoSchedule })}
            />
            <ToggleSetting
              label="Auto-send follow-ups"
              description="AI sends follow-up messages to leads"
              enabled={settings.autonomy.autoFollowUp}
              onChange={(autoFollowUp) => updateAutonomy({ autoFollowUp })}
            />
            <ToggleSetting
              label="Auto-send invoice reminders"
              description="AI sends payment reminders for overdue invoices"
              enabled={settings.autonomy.autoInvoiceReminders}
              onChange={(autoInvoiceReminders) => updateAutonomy({ autoInvoiceReminders })}
            />
          </div>

          <div className="pt-4 border-t border-ghost-border space-y-4">
            <h5 className="text-xs text-ghost-muted uppercase tracking-wide">Require Approval For</h5>
            <ToggleSetting
              label="Spending decisions"
              description={`Amounts over $${settings.autonomy.requireApproval.spendingLimit}`}
              enabled={settings.autonomy.requireApproval.spending}
              onChange={(spending) => updateAutonomy({
                requireApproval: { ...settings.autonomy.requireApproval, spending }
              })}
            />
            <ToggleSetting
              label="Customer messaging"
              description="Review messages before sending"
              enabled={settings.autonomy.requireApproval.messaging}
              onChange={(messaging) => updateAutonomy({
                requireApproval: { ...settings.autonomy.requireApproval, messaging }
              })}
            />
            <ToggleSetting
              label="Calendar changes"
              description="Approve scheduling changes"
              enabled={settings.autonomy.requireApproval.scheduling}
              onChange={(scheduling) => updateAutonomy({
                requireApproval: { ...settings.autonomy.requireApproval, scheduling }
              })}
            />
          </div>
        </SettingSection>

        {/* Notifications */}
        <SettingSection
          title="Notifications"
          description="When and how your Co-Founder communicates with you"
        >
          <ToggleSetting
            label="Daily briefing"
            description="Morning summary of priorities and metrics"
            enabled={settings.notifications.dailyBriefing}
            onChange={(dailyBriefing) => updateNotifications({ dailyBriefing })}
          />
          {settings.notifications.dailyBriefing && (
            <div className="pl-4 border-l-2 border-ghost-border">
              <label className="block text-xs text-ghost-muted mb-1">Briefing time</label>
              <input
                type="time"
                value={settings.notifications.dailyBriefingTime}
                onChange={(e) => updateNotifications({ dailyBriefingTime: e.target.value })}
                className="bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <ToggleSetting
            label="Weekly strategy report"
            description="Performance review and recommendations"
            enabled={settings.notifications.weeklyReport}
            onChange={(weeklyReport) => updateNotifications({ weeklyReport })}
          />

          <div className="pt-4 border-t border-ghost-border space-y-4">
            <h5 className="text-xs text-ghost-muted uppercase tracking-wide">Alert Types</h5>
            <ToggleSetting
              label="Action alerts"
              description="When AI takes an action on your behalf"
              enabled={settings.notifications.actionAlerts}
              onChange={(actionAlerts) => updateNotifications({ actionAlerts })}
            />
            <ToggleSetting
              label="Opportunity alerts"
              description="When new opportunities are detected"
              enabled={settings.notifications.opportunityAlerts}
              onChange={(opportunityAlerts) => updateNotifications({ opportunityAlerts })}
            />
            <ToggleSetting
              label="Risk alerts"
              description="When potential issues are detected"
              enabled={settings.notifications.riskAlerts}
              onChange={(riskAlerts) => updateNotifications({ riskAlerts })}
            />
          </div>

          <div className="pt-4 border-t border-ghost-border space-y-4">
            <h5 className="text-xs text-ghost-muted uppercase tracking-wide">Delivery</h5>
            <ToggleSetting
              label="Email notifications"
              enabled={settings.notifications.emailNotifications}
              onChange={(emailNotifications) => updateNotifications({ emailNotifications })}
            />
            <ToggleSetting
              label="Push notifications"
              enabled={settings.notifications.pushNotifications}
              onChange={(pushNotifications) => updateNotifications({ pushNotifications })}
            />
          </div>
        </SettingSection>

        {/* Learning Preferences */}
        <SettingSection
          title="Learning & Preferences"
          description="Help your Co-Founder understand your business better"
        >
          <SelectSetting
            label="Communication style"
            value={settings.learning.communicationStyle}
            options={[
              { value: 'formal', label: 'Formal - Professional and business-like' },
              { value: 'casual', label: 'Casual - Friendly and conversational' },
              { value: 'adaptive', label: 'Adaptive - Match customer tone' }
            ]}
            onChange={(communicationStyle) => updateLearning({
              communicationStyle: communicationStyle as LearningPreferences['communicationStyle']
            })}
          />

          <div>
            <label className="block text-sm text-white mb-1">Industry context</label>
            <input
              type="text"
              value={settings.learning.industryContext}
              onChange={(e) => updateLearning({ industryContext: e.target.value })}
              className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="e.g., Home services, Plumbing"
            />
          </div>

          <div>
            <label className="block text-sm text-white mb-1">Target audience</label>
            <input
              type="text"
              value={settings.learning.targetAudience}
              onChange={(e) => updateLearning({ targetAudience: e.target.value })}
              className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="e.g., Homeowners aged 35-65"
            />
          </div>

          <div>
            <label className="block text-sm text-white mb-1">Brand voice description</label>
            <textarea
              value={settings.learning.brandVoice}
              onChange={(e) => updateLearning({ brandVoice: e.target.value })}
              rows={2}
              className="w-full bg-ghost-bg border border-ghost-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
              placeholder="Describe how you want your business to sound"
            />
          </div>

          <TagInput
            label="Key phrases to use"
            tags={settings.learning.keyPhrases}
            onChange={(keyPhrases) => updateLearning({ keyPhrases })}
            placeholder="Add a phrase"
          />

          <TagInput
            label="Phrases to avoid"
            tags={settings.learning.avoidPhrases}
            onChange={(avoidPhrases) => updateLearning({ avoidPhrases })}
            placeholder="Add a phrase"
          />
        </SettingSection>
      </div>
    </div>
  )
}
