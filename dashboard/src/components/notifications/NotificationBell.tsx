'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  X,
  UserPlus,
  DollarSign,
  AlertTriangle,
  PhoneMissed,
  Sunrise,
  Lightbulb,
  Loader2
} from 'lucide-react'
import {
  fetchNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  formatNotificationTime,
  getPriorityStyles,
  type Notification,
  type NotificationType,
  type NotificationPriority
} from '@/lib/notifications'

interface NotificationBellProps {
  businessId: string | null
  onNotificationClick?: (notification: Notification) => void
}

function getNotificationIcon(type: NotificationType): React.ReactNode {
  const iconProps = { className: 'w-4 h-4' }

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

export default function NotificationBell({ businessId, onNotificationClick }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    if (!businessId) return

    setIsLoading(true)
    try {
      const result = await fetchNotifications(businessId, {
        limit: 10,
        unreadOnly: false
      })
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  // Initial load and polling
  useEffect(() => {
    loadNotifications()

    // Poll for new notifications every 30 seconds
    const pollInterval = setInterval(loadNotifications, 30000)

    return () => clearInterval(pollInterval)
  }, [loadNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle marking single notification as read
  const handleMarkRead = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!businessId) return

    // Optimistic update
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id
          ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
          : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    const result = await markNotificationsRead(businessId, notification.id)
    if (!result.success) {
      // Revert on failure
      loadNotifications()
    }
  }

  // Handle marking all as read
  const handleMarkAllRead = async () => {
    if (!businessId || unreadCount === 0) return

    setIsMarkingAllRead(true)

    // Optimistic update
    setNotifications(prev =>
      prev.map(n => ({
        ...n,
        status: 'read' as const,
        read_at: n.read_at || new Date().toISOString()
      }))
    )
    setUnreadCount(0)

    const result = await markAllNotificationsRead(businessId)
    if (!result.success) {
      // Revert on failure
      loadNotifications()
    }

    setIsMarkingAllRead(false)
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status !== 'read' && businessId) {
      await markNotificationsRead(businessId, notification.id)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    if (onNotificationClick) {
      onNotificationClick(notification)
    }

    setIsOpen(false)
  }

  const isUnread = (notification: Notification) =>
    notification.status === 'sent' || notification.status === 'pending'

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-ghost-muted hover:text-white hover:bg-ghost-border/50 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-emerald-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-ghost-card border border-ghost-border rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ghost-border bg-ghost-bg/50">
            <h3 className="font-medium text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAllRead}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                >
                  {isMarkingAllRead ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3 h-3" />
                  )}
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-ghost-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-ghost-muted animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-ghost-muted">
                <Bell className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">We'll let you know when something happens</p>
              </div>
            ) : (
              <ul className="divide-y divide-ghost-border">
                {notifications.map(notification => {
                  const priorityStyles = getPriorityStyles(notification.priority)
                  const unread = isUnread(notification)

                  return (
                    <li
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`
                        relative px-4 py-3 cursor-pointer transition-colors
                        ${unread ? 'bg-ghost-bg/50' : 'bg-transparent'}
                        hover:bg-ghost-border/30
                      `}
                    >
                      {/* Unread indicator */}
                      {unread && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      )}

                      <div className="flex gap-3">
                        {/* Icon */}
                        <div
                          className={`
                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                            ${priorityStyles.bgColor} ${priorityStyles.textColor}
                          `}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm font-medium truncate ${
                                unread ? 'text-white' : 'text-ghost-muted'
                              }`}
                            >
                              {notification.title}
                            </p>
                            <span className="text-[10px] text-ghost-muted whitespace-nowrap">
                              {formatNotificationTime(notification.created_at)}
                            </span>
                          </div>

                          <p
                            className={`text-xs mt-0.5 line-clamp-2 ${
                              unread ? 'text-ghost-muted' : 'text-ghost-muted/70'
                            }`}
                          >
                            {notification.message}
                          </p>

                          {/* Priority badge for high/urgent */}
                          {(notification.priority === 'high' || notification.priority === 'urgent') && (
                            <span
                              className={`
                                inline-flex items-center mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium
                                ${priorityStyles.bgColor} ${priorityStyles.textColor} border ${priorityStyles.borderColor}
                              `}
                            >
                              {notification.priority === 'urgent' ? 'Urgent' : 'High Priority'}
                            </span>
                          )}
                        </div>

                        {/* Mark as read button */}
                        {unread && (
                          <button
                            onClick={(e) => handleMarkRead(notification, e)}
                            className="flex-shrink-0 p-1 text-ghost-muted hover:text-emerald-400 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-ghost-border bg-ghost-bg/50">
              <button
                onClick={() => {
                  // Could navigate to a full notifications page
                  setIsOpen(false)
                }}
                className="w-full text-center text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
