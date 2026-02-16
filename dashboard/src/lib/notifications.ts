/**
 * Notification Utilities for GhostOps Dashboard
 *
 * Provides helper functions for sending various types of notifications
 * to business owners through multiple channels.
 */

import { createBrowserClient } from '@supabase/ssr'

// Notification types - shared between client and server
export type NotificationType =
  | 'new_lead'
  | 'payment_received'
  | 'invoice_overdue'
  | 'missed_call'
  | 'daily_briefing'
  | 'system_alert'
  | 'co_founder_insight'

export type NotificationChannel = 'push' | 'sms' | 'email' | 'in_app'
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

// Notification interface for client-side use
export interface Notification {
  id: string
  business_id: string
  type: NotificationType
  title: string
  message: string
  channel: NotificationChannel
  priority: NotificationPriority
  status: 'pending' | 'sent' | 'failed' | 'read'
  metadata: Record<string, unknown>
  scheduled_for: string | null
  sent_at: string | null
  read_at: string | null
  created_at: string
}

// Configuration for notification behavior
interface NotificationConfig {
  defaultChannels: NotificationChannel[]
  retryAttempts: number
  retryDelayMs: number
}

const defaultConfig: NotificationConfig = {
  defaultChannels: ['in_app'],
  retryAttempts: 3,
  retryDelayMs: 1000
}

// API base URL detection
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Server-side fallback
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Send a notification via the API
 */
async function sendNotificationRequest(params: {
  type: NotificationType
  title: string
  message: string
  businessId: string
  channel?: NotificationChannel | NotificationChannel[]
  priority?: NotificationPriority
  metadata?: Record<string, unknown>
  scheduledFor?: string
}): Promise<{ success: boolean; results?: Array<{ channel: string; success: boolean; notificationId?: string; error?: string }> }> {
  const baseUrl = getApiBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Notification API error:', data)
      return { success: false }
    }

    return data
  } catch (error) {
    console.error('Failed to send notification:', error)
    return { success: false }
  }
}

/**
 * Send an alert to the business owner
 *
 * @param businessId - The business ID
 * @param title - Alert title
 * @param message - Alert message
 * @param priority - Priority level (defaults to 'medium')
 */
export async function sendOwnerAlert(
  businessId: string,
  title: string,
  message: string,
  priority: NotificationPriority = 'medium'
): Promise<{ success: boolean }> {
  // Determine channels based on priority
  const channels: NotificationChannel[] = ['in_app']

  if (priority === 'high') {
    channels.push('push')
  }

  if (priority === 'urgent') {
    channels.push('push', 'sms')
  }

  return sendNotificationRequest({
    type: 'system_alert',
    title,
    message,
    businessId,
    channel: channels,
    priority
  })
}

/**
 * Send daily briefing notification to business owner
 *
 * @param businessId - The business ID
 * @param briefing - Briefing data object containing business metrics
 */
export async function sendDailyBriefing(
  businessId: string,
  briefing: {
    date?: string
    newLeads?: number
    messagesHandled?: number
    invoicesSent?: number
    revenueCollected?: number
    upcomingTasks?: string[]
    highlights?: string[]
    concerns?: string[]
  }
): Promise<{ success: boolean }> {
  const date = briefing.date || new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })

  // Build briefing message
  const messageParts: string[] = [`Good morning! Here's your briefing for ${date}:`]

  if (briefing.newLeads !== undefined) {
    messageParts.push(`- ${briefing.newLeads} new lead${briefing.newLeads !== 1 ? 's' : ''}`)
  }

  if (briefing.messagesHandled !== undefined) {
    messageParts.push(`- ${briefing.messagesHandled} messages handled by Ghost`)
  }

  if (briefing.invoicesSent !== undefined) {
    messageParts.push(`- ${briefing.invoicesSent} invoice${briefing.invoicesSent !== 1 ? 's' : ''} sent`)
  }

  if (briefing.revenueCollected !== undefined) {
    messageParts.push(`- $${briefing.revenueCollected.toLocaleString()} collected`)
  }

  if (briefing.highlights && briefing.highlights.length > 0) {
    messageParts.push('\nHighlights:')
    briefing.highlights.forEach(h => messageParts.push(`  + ${h}`))
  }

  if (briefing.concerns && briefing.concerns.length > 0) {
    messageParts.push('\nNeeds attention:')
    briefing.concerns.forEach(c => messageParts.push(`  ! ${c}`))
  }

  if (briefing.upcomingTasks && briefing.upcomingTasks.length > 0) {
    messageParts.push('\nToday\'s focus:')
    briefing.upcomingTasks.slice(0, 3).forEach(t => messageParts.push(`  - ${t}`))
  }

  return sendNotificationRequest({
    type: 'daily_briefing',
    title: `Daily Briefing - ${date}`,
    message: messageParts.join('\n'),
    businessId,
    channel: ['in_app', 'push'],
    priority: 'medium',
    metadata: { briefing }
  })
}

/**
 * Queue a payment reminder notification
 *
 * @param invoiceId - The invoice ID to send reminder for
 */
export async function queuePaymentReminder(invoiceId: string): Promise<{ success: boolean }> {
  // We need to fetch invoice details to get business ID and amount
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, businesses(id, name)')
    .eq('id', invoiceId)
    .single()

  if (error || !invoice) {
    console.error('Failed to fetch invoice for payment reminder:', error)
    return { success: false }
  }

  const amount = (invoice.amount_cents / 100).toFixed(2)
  const contactName = invoice.contact_name || 'Customer'
  const daysSinceSent = invoice.sent_at
    ? Math.floor((Date.now() - new Date(invoice.sent_at).getTime()) / 86400000)
    : 0

  let priority: NotificationPriority = 'medium'
  let urgencyText = ''

  if (daysSinceSent > 30) {
    priority = 'urgent'
    urgencyText = ` (${daysSinceSent} days overdue)`
  } else if (daysSinceSent > 14) {
    priority = 'high'
    urgencyText = ` (${daysSinceSent} days since sent)`
  }

  return sendNotificationRequest({
    type: 'invoice_overdue',
    title: `Payment Reminder: $${amount} from ${contactName}`,
    message: `Invoice for $${amount} to ${contactName} is awaiting payment${urgencyText}. Consider sending a follow-up.`,
    businessId: invoice.business_id,
    channel: priority === 'urgent' ? ['in_app', 'push', 'sms'] : ['in_app', 'push'],
    priority,
    metadata: {
      invoiceId,
      amount: invoice.amount_cents,
      contactName,
      daysSinceSent
    }
  })
}

/**
 * Queue a new lead alert notification
 *
 * @param contactId - The contact/lead ID to alert about
 */
export async function queueLeadAlert(contactId: string): Promise<{ success: boolean }> {
  // Fetch contact details
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  if (error || !contact) {
    console.error('Failed to fetch contact for lead alert:', error)
    return { success: false }
  }

  const name = contact.name || contact.phone || 'Unknown'
  const source = contact.source || 'direct'

  return sendNotificationRequest({
    type: 'new_lead',
    title: `New Lead: ${name}`,
    message: `A new lead just came in from ${source}. Ghost is ready to engage or you can respond directly.`,
    businessId: contact.business_id,
    channel: ['in_app', 'push'],
    priority: 'high',
    metadata: {
      contactId,
      contactName: name,
      source,
      phone: contact.phone,
      email: contact.email
    }
  })
}

/**
 * Send a missed call notification
 *
 * @param businessId - The business ID
 * @param phoneNumber - The caller's phone number
 * @param contactName - Optional contact name if known
 */
export async function sendMissedCallAlert(
  businessId: string,
  phoneNumber: string,
  contactName?: string
): Promise<{ success: boolean }> {
  const caller = contactName || phoneNumber

  return sendNotificationRequest({
    type: 'missed_call',
    title: `Missed Call from ${caller}`,
    message: contactName
      ? `${contactName} (${phoneNumber}) called and you missed it. Ghost sent them a text-back.`
      : `You missed a call from ${phoneNumber}. Ghost sent them a text-back to keep them engaged.`,
    businessId,
    channel: ['in_app', 'push'],
    priority: 'medium',
    metadata: {
      phoneNumber,
      contactName,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Send a payment received notification
 *
 * @param businessId - The business ID
 * @param amount - Payment amount in dollars
 * @param contactName - Payer name
 * @param invoiceId - Optional invoice ID
 */
export async function sendPaymentReceivedAlert(
  businessId: string,
  amount: number,
  contactName: string,
  invoiceId?: string
): Promise<{ success: boolean }> {
  return sendNotificationRequest({
    type: 'payment_received',
    title: `Payment Received: $${amount.toFixed(2)}`,
    message: `${contactName} just paid $${amount.toFixed(2)}. Nice!`,
    businessId,
    channel: ['in_app', 'push'],
    priority: 'low',
    metadata: {
      amount,
      contactName,
      invoiceId
    }
  })
}

/**
 * Send a co-founder insight notification
 *
 * @param businessId - The business ID
 * @param insight - The insight message
 * @param actionSuggestion - Optional suggested action
 */
export async function sendCoFounderInsight(
  businessId: string,
  insight: string,
  actionSuggestion?: string
): Promise<{ success: boolean }> {
  const message = actionSuggestion
    ? `${insight}\n\nSuggested action: ${actionSuggestion}`
    : insight

  return sendNotificationRequest({
    type: 'co_founder_insight',
    title: 'Insight from your AI Co-Founder',
    message,
    businessId,
    channel: ['in_app'],
    priority: 'low',
    metadata: {
      insight,
      actionSuggestion
    }
  })
}

/**
 * Fetch notifications for a business (client-side)
 */
export async function fetchNotifications(
  businessId: string,
  options?: {
    unreadOnly?: boolean
    limit?: number
    offset?: number
    type?: NotificationType
  }
): Promise<{
  notifications: Notification[]
  total: number
  unreadCount: number
  pagination: { limit: number; offset: number; hasMore: boolean }
}> {
  const params = new URLSearchParams({
    businessId,
    ...(options?.unreadOnly && { unreadOnly: 'true' }),
    ...(options?.limit && { limit: options.limit.toString() }),
    ...(options?.offset && { offset: options.offset.toString() }),
    ...(options?.type && { type: options.type })
  })

  const baseUrl = getApiBaseUrl()
  const response = await fetch(`${baseUrl}/api/notifications?${params}`)

  if (!response.ok) {
    throw new Error('Failed to fetch notifications')
  }

  return response.json()
}

/**
 * Mark notification(s) as read
 */
export async function markNotificationsRead(
  businessId: string,
  notificationIds: string | string[]
): Promise<{ success: boolean }> {
  const baseUrl = getApiBaseUrl()
  const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds]

  const response = await fetch(`${baseUrl}/api/notifications`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId,
      notificationIds: ids,
      action: 'mark_read'
    })
  })

  if (!response.ok) {
    return { success: false }
  }

  return response.json()
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(businessId: string): Promise<{ success: boolean; count?: number }> {
  const baseUrl = getApiBaseUrl()

  const response = await fetch(`${baseUrl}/api/notifications`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId,
      action: 'mark_all_read'
    })
  })

  if (!response.ok) {
    return { success: false }
  }

  return response.json()
}

/**
 * Get priority styles for notifications
 */
export function getPriorityStyles(priority: NotificationPriority): {
  bgColor: string
  textColor: string
  borderColor: string
  icon: string
} {
  switch (priority) {
    case 'urgent':
      return {
        bgColor: 'bg-red-500/10',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
        icon: '!!'
      }
    case 'high':
      return {
        bgColor: 'bg-orange-500/10',
        textColor: 'text-orange-400',
        borderColor: 'border-orange-500/30',
        icon: '!'
      }
    case 'medium':
      return {
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        icon: ''
      }
    case 'low':
    default:
      return {
        bgColor: 'bg-ghost-border/50',
        textColor: 'text-ghost-muted',
        borderColor: 'border-ghost-border',
        icon: ''
      }
  }
}

/**
 * Get notification type icon
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  switch (type) {
    case 'new_lead':
      return 'user-plus'
    case 'payment_received':
      return 'dollar-sign'
    case 'invoice_overdue':
      return 'alert-triangle'
    case 'missed_call':
      return 'phone-missed'
    case 'daily_briefing':
      return 'sunrise'
    case 'system_alert':
      return 'bell'
    case 'co_founder_insight':
      return 'lightbulb'
    default:
      return 'bell'
  }
}

/**
 * Format notification timestamp for display
 */
export function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return 'Just now'
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}
