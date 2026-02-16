import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Twilio client type - using any since twilio types can be complex
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwilioClient = any

// Lazy initialization for external clients
let supabase: SupabaseClient | null = null
let twilioClient: TwilioClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

async function getTwilio(): Promise<TwilioClient | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken || accountSid === 'FILL_ME_IN' || authToken === 'FILL_ME_IN') {
    console.warn('Twilio credentials not configured')
    return null
  }

  if (!twilioClient) {
    const twilio = await import('twilio')
    twilioClient = twilio.default(accountSid, authToken)
  }
  return twilioClient
}

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

interface SendNotificationRequest {
  type: NotificationType
  title: string
  message: string
  businessId: string
  channel?: NotificationChannel | NotificationChannel[]
  priority?: NotificationPriority
  metadata?: Record<string, unknown>
  scheduledFor?: string // ISO timestamp for scheduled delivery
}

interface NotificationRecord {
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
  error: string | null
  created_at: string
}

async function getBusinessOwnerPhone(db: SupabaseClient, businessId: string): Promise<string | null> {
  const { data, error } = await db
    .from('businesses')
    .select('owner_phone')
    .eq('id', businessId)
    .single()

  if (error || !data) {
    console.error('Failed to fetch business owner phone:', error)
    return null
  }

  return data.owner_phone
}

async function sendSmsNotification(
  phone: string,
  title: string,
  message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const twilio = await getTwilio()

  if (!twilio) {
    return { success: false, error: 'Twilio not configured' }
  }

  const twilioPhone = process.env.TWILIO_PHONE_NUMBER
  if (!twilioPhone) {
    return { success: false, error: 'Twilio phone number not configured' }
  }

  try {
    // Format message for SMS (160 char awareness)
    const smsContent = `${title}\n\n${message}`.slice(0, 1600) // Twilio handles segmentation

    const result = await twilio.messages.create({
      body: smsContent,
      from: twilioPhone,
      to: phone
    })

    return { success: true, messageId: result.sid }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown SMS error'
    console.error('SMS send failed:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

async function sendPushNotification(
  businessId: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Push notifications via web push or service worker
  // For now, we store in database and rely on client-side polling/realtime
  // Future: Integrate with web-push library or service like OneSignal
  console.log('Push notification queued:', { businessId, title })
  return { success: true }
}

async function sendEmailNotification(
  businessId: string,
  title: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  // Email notifications - future implementation
  // Could use Resend, SendGrid, or SES
  console.log('Email notification queued (not implemented):', { businessId, title })
  return { success: false, error: 'Email notifications not yet implemented' }
}

async function queueNotification(
  db: SupabaseClient,
  notification: Omit<NotificationRecord, 'id' | 'created_at' | 'sent_at' | 'read_at' | 'error'>
): Promise<NotificationRecord | null> {
  const { data, error } = await db
    .from('notifications')
    .insert({
      business_id: notification.business_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      channel: notification.channel,
      priority: notification.priority,
      status: notification.status,
      metadata: notification.metadata,
      scheduled_for: notification.scheduled_for
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to queue notification:', error)
    return null
  }

  return data as NotificationRecord
}

async function updateNotificationStatus(
  db: SupabaseClient,
  notificationId: string,
  status: 'sent' | 'failed',
  error?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    sent_at: status === 'sent' ? new Date().toISOString() : null
  }

  if (error) {
    updateData.error = error
  }

  await db
    .from('notifications')
    .update(updateData)
    .eq('id', notificationId)
}

export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationRequest = await request.json()
    const {
      type,
      title,
      message,
      businessId,
      channel = 'in_app',
      priority = 'medium',
      metadata = {},
      scheduledFor
    } = body

    // Validate required fields
    if (!type || !title || !message || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, message, businessId' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    // Verify business exists
    const { data: business, error: bizError } = await db
      .from('businesses')
      .select('id, owner_phone, owner_email, settings')
      .eq('id', businessId)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Normalize channels to array
    const channels: NotificationChannel[] = Array.isArray(channel) ? channel : [channel]

    const results: Array<{
      channel: NotificationChannel
      success: boolean
      notificationId?: string
      error?: string
    }> = []

    // Process each channel
    for (const chan of channels) {
      // Queue notification in database first
      const notification = await queueNotification(db, {
        business_id: businessId,
        type,
        title,
        message,
        channel: chan,
        priority,
        status: scheduledFor ? 'pending' : 'pending',
        metadata,
        scheduled_for: scheduledFor || null
      })

      if (!notification) {
        results.push({ channel: chan, success: false, error: 'Failed to queue notification' })
        continue
      }

      // If scheduled for later, don't send now
      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        results.push({ channel: chan, success: true, notificationId: notification.id })
        continue
      }

      // Send immediately based on channel
      let sendResult: { success: boolean; error?: string; messageId?: string }

      switch (chan) {
        case 'sms':
          const phone = business.owner_phone
          if (!phone) {
            sendResult = { success: false, error: 'No phone number on file' }
          } else {
            sendResult = await sendSmsNotification(phone, title, message)
          }
          break

        case 'push':
          sendResult = await sendPushNotification(businessId, title, message, metadata)
          break

        case 'email':
          sendResult = await sendEmailNotification(businessId, title, message)
          break

        case 'in_app':
        default:
          // In-app notifications are immediately available via the database
          sendResult = { success: true }
          break
      }

      // Update notification status
      await updateNotificationStatus(
        db,
        notification.id,
        sendResult.success ? 'sent' : 'failed',
        sendResult.error
      )

      results.push({
        channel: chan,
        success: sendResult.success,
        notificationId: notification.id,
        error: sendResult.error
      })
    }

    const allSucceeded = results.every(r => r.success)
    const anySucceeded = results.some(r => r.success)

    return NextResponse.json({
      success: anySucceeded,
      results,
      message: allSucceeded
        ? 'All notifications sent successfully'
        : anySucceeded
        ? 'Some notifications sent successfully'
        : 'All notifications failed'
    }, { status: allSucceeded ? 200 : anySucceeded ? 207 : 500 })

  } catch (error) {
    console.error('Notification send error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
