'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { toast, Toaster } from 'sonner'
import {
  Bell,
  UserPlus,
  DollarSign,
  AlertTriangle,
  PhoneMissed,
  Sunrise,
  Lightbulb,
  X,
  Undo2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  markNotificationsRead,
  formatNotificationTime,
  getPriorityStyles,
  type Notification,
  type NotificationType,
  type NotificationPriority
} from '@/lib/notifications'

interface NotificationToastProps {
  businessId: string | null
  enabled?: boolean
  onNotificationReceived?: (notification: Notification) => void
}

function getNotificationIcon(type: NotificationType): React.ReactNode {
  const iconProps = { className: 'w-5 h-5' }

  switch (type) {
    case 'new_lead':
      return <UserPlus {...iconProps} />
    case 'payment_received':
      return <DollarSign {...iconProps} />
    case 'invoice_overdue':
      return <AlertTriangle {...iconProps} />
    case 'missed_call':
      return <PhoneMissed {...iconProps} />
    case 'daily_briefing':
      return <Sunrise {...iconProps} />
    case 'co_founder_insight':
      return <Lightbulb {...iconProps} />
    case 'system_alert':
    default:
      return <Bell {...iconProps} />
  }
}

function getAutoDismissTime(priority: NotificationPriority): number {
  switch (priority) {
    case 'urgent':
      return 15000 // 15 seconds for urgent
    case 'high':
      return 10000 // 10 seconds for high
    case 'medium':
      return 6000 // 6 seconds for medium
    case 'low':
    default:
      return 4000 // 4 seconds for low
  }
}

interface ToastContentProps {
  notification: Notification
  onDismiss: () => void
  onUndo?: () => void
}

function ToastContent({ notification, onDismiss, onUndo }: ToastContentProps) {
  const priorityStyles = getPriorityStyles(notification.priority)
  const isUrgent = notification.priority === 'urgent' || notification.priority === 'high'

  return (
    <div className="flex items-start gap-3 w-full">
      {/* Icon */}
      <div
        className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${priorityStyles.bgColor} ${priorityStyles.textColor}
        `}
      >
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-white">
            {notification.title}
          </p>
        </div>

        <p className="text-xs text-ghost-muted mt-0.5 line-clamp-2">
          {notification.message}
        </p>

        {/* Priority badge for high/urgent */}
        {isUrgent && (
          <span
            className={`
              inline-flex items-center mt-2 px-2 py-0.5 rounded text-[10px] font-medium
              ${priorityStyles.bgColor} ${priorityStyles.textColor} border ${priorityStyles.borderColor}
            `}
          >
            {notification.priority === 'urgent' ? 'Urgent' : 'High Priority'}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onDismiss}
            className="text-xs text-ghost-muted hover:text-white transition-colors"
          >
            Dismiss
          </button>
          {onUndo && (
            <button
              onClick={onUndo}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Undo2 className="w-3 h-3" />
              Undo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotificationToast({
  businessId,
  enabled = true,
  onNotificationReceived
}: NotificationToastProps) {
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [recentNotifications, setRecentNotifications] = useState<Set<string>>(new Set())
  const dismissedRef = useRef<Set<string>>(new Set())

  // Show toast for a notification
  const showNotificationToast = useCallback((notification: Notification) => {
    // Don't show if already dismissed or recently shown
    if (dismissedRef.current.has(notification.id) || recentNotifications.has(notification.id)) {
      return
    }

    const priorityStyles = getPriorityStyles(notification.priority)
    const duration = getAutoDismissTime(notification.priority)

    // Track this notification
    setRecentNotifications(prev => {
      const newSet = new Set(prev)
      newSet.add(notification.id)
      return newSet
    })

    // Clear from recent after showing
    setTimeout(() => {
      setRecentNotifications(prev => {
        const newSet = new Set(prev)
        newSet.delete(notification.id)
        return newSet
      })
    }, duration + 1000)

    // Mark as read when dismissed
    const handleDismiss = () => {
      dismissedRef.current.add(notification.id)
      if (businessId) {
        markNotificationsRead(businessId, notification.id)
      }
      toast.dismiss(notification.id)
    }

    // Show custom toast
    toast.custom(
      (t) => (
        <div
          className={`
            w-full max-w-md bg-ghost-card border rounded-xl p-4 shadow-2xl
            ${priorityStyles.borderColor}
            ${notification.priority === 'urgent' ? 'animate-pulse' : ''}
          `}
        >
          <ToastContent
            notification={notification}
            onDismiss={handleDismiss}
          />
        </div>
      ),
      {
        id: notification.id,
        duration,
        position: 'bottom-right',
        onDismiss: () => handleDismiss(),
        onAutoClose: () => handleDismiss()
      }
    )

    // Play sound for high priority notifications
    if ((notification.priority === 'high' || notification.priority === 'urgent') && typeof window !== 'undefined') {
      try {
        // Use Web Audio API for notification sound
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = notification.priority === 'urgent' ? 880 : 660
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      } catch {
        // Audio not supported or blocked
      }
    }

    // Callback
    if (onNotificationReceived) {
      onNotificationReceived(notification)
    }
  }, [businessId, onNotificationReceived, recentNotifications])

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!businessId || !enabled) return

    // Create subscription channel
    const channel = supabase
      .channel(`notifications:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          const notification = payload.new as Notification

          // Only show toast for in_app channel or push channel
          if (notification.channel === 'in_app' || notification.channel === 'push') {
            // Small delay to ensure the notification is fully saved
            setTimeout(() => {
              showNotificationToast(notification)
            }, 100)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to notifications channel')
        }
      })

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [businessId, enabled, showNotificationToast])

  // Cleanup dismissed notifications periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Clear dismissed notifications older than 5 minutes
      // This is a simple implementation - in production you'd track timestamps
      if (dismissedRef.current.size > 100) {
        dismissedRef.current.clear()
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(cleanup)
  }, [])

  // This component primarily manages subscriptions
  // The actual toasts are rendered by Sonner's Toaster in layout.tsx
  return null
}

// Export a hook for programmatic toast notifications
export function useNotificationToast() {
  const showToast = useCallback((notification: Partial<Notification> & { title: string; message: string }) => {
    const priorityStyles = getPriorityStyles(notification.priority || 'medium')
    const duration = getAutoDismissTime(notification.priority || 'medium')

    toast.custom(
      (t) => (
        <div
          className={`
            w-full max-w-md bg-ghost-card border rounded-xl p-4 shadow-2xl
            ${priorityStyles.borderColor}
          `}
        >
          <div className="flex items-start gap-3 w-full">
            <div
              className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                ${priorityStyles.bgColor} ${priorityStyles.textColor}
              `}
            >
              {getNotificationIcon(notification.type || 'system_alert')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{notification.title}</p>
              <p className="text-xs text-ghost-muted mt-0.5">{notification.message}</p>
            </div>
            <button
              onClick={() => toast.dismiss(t)}
              className="flex-shrink-0 p-1 text-ghost-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ),
      {
        duration,
        position: 'bottom-right'
      }
    )
  }, [])

  return { showToast }
}
