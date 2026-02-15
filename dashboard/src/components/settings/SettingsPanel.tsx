'use client'

import { useState } from 'react'
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
  HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface SettingsPanelProps {
  businessId: string
}

interface ToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? 'bg-emerald-600' : 'bg-ghost-border'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function SettingsPanel({ businessId }: SettingsPanelProps) {
  // Local state for settings (in production, these would be fetched/saved to Supabase)
  const [settings, setSettings] = useState({
    aiEnabled: true,
    autoReply: true,
    workingHoursOnly: false,
    notifyOnNewLead: true,
    notifyOnPayment: true,
    notifyOnMissedCall: true,
    darkMode: true,
    soundEnabled: false,
  })

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    toast.success('Setting updated', {
      description: `${key} has been ${value ? 'enabled' : 'disabled'}`,
    })
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

  return (
    <div className="space-y-6 max-w-2xl">
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
                return (
                  <div
                    key={setting.key}
                    className="p-4 flex items-center justify-between hover:bg-ghost-border/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <SettingIcon className="w-5 h-5 text-ghost-muted" />
                      <div>
                        <div className="text-white font-medium">{setting.label}</div>
                        <div className="text-sm text-ghost-muted">{setting.description}</div>
                      </div>
                    </div>
                    <Toggle
                      enabled={settings[setting.key]}
                      onChange={(value) => updateSetting(setting.key, value)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

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
