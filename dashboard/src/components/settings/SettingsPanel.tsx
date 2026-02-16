'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  Bot,
  Clock,
  Shield,
  Smartphone,
  Moon,
  Volume2,
  MessageSquare,
  Zap,
  HelpCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Link,
  Calendar,
  Mail,
  Star,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getBusinessSettings,
  updateBusinessSettings,
  BusinessSettings,
  isSupabaseConfigured
} from '@/lib/supabase'

interface SettingsPanelProps {
  businessId: string
}

interface ToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

function Toggle({ enabled, onChange, disabled }: ToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? 'bg-emerald-600' : 'bg-ghost-border'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

type SettingKey = keyof BusinessSettings

export default function SettingsPanel({ businessId }: SettingsPanelProps) {
  const [settings, setSettings] = useState<BusinessSettings>({
    aiEnabled: true,
    autoReply: true,
    workingHoursOnly: false,
    notifyOnNewLead: true,
    notifyOnPayment: true,
    notifyOnMissedCall: true,
    darkMode: true,
    soundEnabled: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKeys, setSavingKeys] = useState<Set<SettingKey>>(new Set())

  const fetchSettings = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const fetchedSettings = await getBusinessSettings(businessId)
      setSettings(fetchedSettings)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings'
      setError(message)
      toast.error('Failed to load settings', {
        description: message,
      })
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = async (key: SettingKey, value: boolean) => {
    // Optimistically update UI
    const previousValue = settings[key]
    setSettings(prev => ({ ...prev, [key]: value }))
    setSavingKeys(prev => new Set(prev).add(key))

    if (!isSupabaseConfigured) {
      // Demo mode - just show success toast
      setTimeout(() => {
        setSavingKeys(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        toast.success('Setting updated', {
          description: `${formatSettingName(key)} has been ${value ? 'enabled' : 'disabled'}`,
        })
      }, 300)
      return
    }

    try {
      await updateBusinessSettings(businessId, { [key]: value })
      toast.success('Setting saved', {
        description: `${formatSettingName(key)} has been ${value ? 'enabled' : 'disabled'}`,
      })
    } catch (err) {
      // Revert on error
      setSettings(prev => ({ ...prev, [key]: previousValue }))
      const message = err instanceof Error ? err.message : 'Failed to save setting'
      toast.error('Failed to save setting', {
        description: message,
      })
    } finally {
      setSavingKeys(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const formatSettingName = (key: SettingKey): string => {
    const names: Record<SettingKey, string> = {
      aiEnabled: 'AI Agent',
      autoReply: 'Auto-Reply',
      workingHoursOnly: 'Working Hours Only',
      notifyOnNewLead: 'New Lead Alerts',
      notifyOnPayment: 'Payment Alerts',
      notifyOnMissedCall: 'Missed Call Alerts',
      darkMode: 'Dark Mode',
      soundEnabled: 'Sound Effects',
    }
    return names[key] || key
  }

  const settingGroups = [
    {
      title: 'AI Behavior',
      icon: Bot,
      settings: [
        {
          key: 'aiEnabled' as const,
          label: 'AI Agent Active',
          description: 'Allow AI to respond to incoming messages',
          icon: Zap,
        },
        {
          key: 'autoReply' as const,
          label: 'Auto-Reply to New Leads',
          description: 'Immediately respond to first-time contacts',
          icon: MessageSquare,
        },
        {
          key: 'workingHoursOnly' as const,
          label: 'Working Hours Only',
          description: 'AI only responds during business hours (9am-6pm)',
          icon: Clock,
        },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      settings: [
        {
          key: 'notifyOnNewLead' as const,
          label: 'New Lead Alerts',
          description: 'Get notified when a new customer messages',
          icon: Smartphone,
        },
        {
          key: 'notifyOnPayment' as const,
          label: 'Payment Alerts',
          description: 'Get notified when invoices are paid',
          icon: Shield,
        },
        {
          key: 'notifyOnMissedCall' as const,
          label: 'Missed Call Alerts',
          description: 'Get notified when calls are missed',
          icon: Volume2,
        },
      ],
    },
    {
      title: 'Appearance',
      icon: Moon,
      settings: [
        {
          key: 'darkMode' as const,
          label: 'Dark Mode',
          description: 'Use dark theme (recommended)',
          icon: Moon,
        },
        {
          key: 'soundEnabled' as const,
          label: 'Sound Effects',
          description: 'Play sounds for notifications',
          icon: Volume2,
        },
      ],
    },
  ]

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-ghost-muted">Loading settings...</p>
        </div>
      </div>
    )
  }

  // Error state with retry
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Failed to load settings</h3>
            <p className="text-ghost-muted text-sm">{error}</p>
          </div>
          <button
            onClick={fetchSettings}
            className="flex items-center gap-2 px-4 py-2 bg-ghost-border text-white rounded-lg hover:bg-ghost-muted/20 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {!isSupabaseConfigured && (
        <div className="bg-amber-600/10 border border-amber-600/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 text-sm font-medium">Demo Mode</p>
            <p className="text-amber-200/70 text-sm">
              Supabase is not configured. Settings changes will not persist.
            </p>
          </div>
        </div>
      )}

      {settingGroups.map((group) => {
        const GroupIcon = group.icon
        return (
          <div
            key={group.title}
            className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-ghost-border flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                <GroupIcon className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{group.title}</h3>
            </div>

            <div className="divide-y divide-ghost-border">
              {group.settings.map((setting) => {
                const SettingIcon = setting.icon
                const isSaving = savingKeys.has(setting.key)
                return (
                  <div
                    key={setting.key}
                    className="p-4 flex items-center justify-between hover:bg-ghost-border/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <SettingIcon className="w-5 h-5 text-ghost-muted" />
                      <div>
                        <div className="text-white font-medium flex items-center gap-2">
                          {setting.label}
                          {isSaving && (
                            <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                          )}
                        </div>
                        <div className="text-sm text-ghost-muted">{setting.description}</div>
                      </div>
                    </div>
                    <Toggle
                      enabled={settings[setting.key]}
                      onChange={(value) => updateSetting(setting.key, value)}
                      disabled={isSaving}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Review Management - Coming Soon */}
      <div className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden opacity-60">
        <div className="p-4 border-b border-ghost-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-600/20 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Review Management</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-600/20 rounded-full text-xs font-medium text-yellow-400">
            <Lock className="w-3 h-3" />
            Coming Soon
          </span>
        </div>
        <div className="divide-y divide-ghost-border">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-ghost-muted" />
              <div>
                <div className="text-white font-medium">Auto-Respond to Reviews</div>
                <div className="text-sm text-ghost-muted">Automatically reply to Google/Yelp reviews with AI</div>
              </div>
            </div>
            <Toggle
              enabled={false}
              onChange={() => {}}
              disabled={true}
            />
          </div>
        </div>
      </div>

      {/* Integrations - Coming Soon */}
      <div className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden opacity-60">
        <div className="p-4 border-b border-ghost-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <Link className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Integrations</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-600/20 rounded-full text-xs font-medium text-purple-400">
            <Lock className="w-3 h-3" />
            Coming Soon
          </span>
        </div>
        <div className="divide-y divide-ghost-border">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-ghost-muted" />
              <div>
                <div className="text-white font-medium">Google Calendar</div>
                <div className="text-sm text-ghost-muted">Sync appointments and schedule bookings</div>
              </div>
            </div>
            <button
              disabled
              className="px-3 py-1.5 bg-ghost-border text-ghost-muted rounded-lg text-sm cursor-not-allowed"
            >
              Connect
            </button>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-ghost-muted" />
              <div>
                <div className="text-white font-medium">Gmail</div>
                <div className="text-sm text-ghost-muted">Send emails and manage inbox</div>
              </div>
            </div>
            <button
              disabled
              className="px-3 py-1.5 bg-ghost-border text-ghost-muted rounded-lg text-sm cursor-not-allowed"
            >
              Connect
            </button>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Need Help?</h3>
            <p className="text-ghost-muted text-sm mb-3">
              Questions about GhostOps? Check our documentation or contact support.
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-ghost-border text-white rounded-lg hover:bg-ghost-muted/20 transition-colors text-sm">
                View Docs
              </button>
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Business ID for debugging */}
      <div className="text-xs text-ghost-muted text-center">
        Business ID: {businessId}
      </div>
    </div>
  )
}
