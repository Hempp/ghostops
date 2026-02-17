import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Twilio client type
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
    console.warn('[SMS] Twilio credentials not configured')
    return null
  }

  if (!twilioClient) {
    const twilio = await import('twilio')
    twilioClient = twilio.default(accountSid, authToken)
  }
  return twilioClient
}

interface SendSmsRequest {
  to: string
  message: string
  businessId: string
  conversationId?: string
}

interface SendSmsResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Verify the request is authenticated
 * Checks for:
 * 1. Bearer token (session access token from Supabase auth)
 * 2. API key (for server-to-server calls)
 */
async function verifyAuthentication(
  request: NextRequest,
  db: SupabaseClient,
  businessId: string
): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return { authenticated: false, error: 'Missing authorization header' }
  }

  // Check for API key authentication (server-to-server)
  const apiKey = process.env.INTERNAL_API_KEY
  if (apiKey && authHeader === `Bearer ${apiKey}`) {
    return { authenticated: true }
  }

  // Check for Supabase session token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)

    try {
      // Verify the JWT with Supabase
      const { data: { user }, error: authError } = await db.auth.getUser(token)

      if (authError || !user) {
        return { authenticated: false, error: 'Invalid or expired token' }
      }

      // Verify user has access to this business
      const { data: businessUser, error: bizError } = await db
        .from('business_users')
        .select('business_id, role')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .single()

      if (bizError || !businessUser) {
        return { authenticated: false, error: 'User does not have access to this business' }
      }

      return { authenticated: true, userId: user.id }
    } catch {
      return { authenticated: false, error: 'Token verification failed' }
    }
  }

  return { authenticated: false, error: 'Invalid authorization format' }
}

/**
 * Get the business's Twilio phone number
 */
async function getBusinessTwilioNumber(
  db: SupabaseClient,
  businessId: string
): Promise<string | null> {
  const { data: business, error } = await db
    .from('businesses')
    .select('twilio_number')
    .eq('id', businessId)
    .single()

  if (error || !business) {
    console.error('[SMS] Error fetching business Twilio number:', error)
    return null
  }

  return business.twilio_number
}

/**
 * Log the sent message to the database
 */
async function logSentMessage(
  db: SupabaseClient,
  {
    conversationId,
    businessId,
    content,
    twilioSid,
  }: {
    conversationId: string
    businessId: string
    content: string
    twilioSid: string
  }
): Promise<void> {
  const { error } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      business_id: businessId,
      direction: 'outbound',
      content,
      message_type: 'text',
      ai_generated: false,
      media_urls: [],
      twilio_sid: twilioSid,
    })

  if (error) {
    console.error('[SMS] Error logging message:', error)
    // Don't throw - the SMS was sent successfully, logging failure shouldn't fail the request
  }

  // Update conversation's last_message_at
  await db
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)
}

/**
 * Update daily stats for outbound messages
 */
async function updateDailyStats(
  db: SupabaseClient,
  businessId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  // Try to increment existing stats or create new record
  const { data: existing } = await db
    .from('daily_stats')
    .select('id, messages_sent')
    .eq('business_id', businessId)
    .eq('date', today)
    .single()

  if (existing) {
    await db
      .from('daily_stats')
      .update({ messages_sent: (existing.messages_sent || 0) + 1 })
      .eq('id', existing.id)
  } else {
    await db
      .from('daily_stats')
      .insert({
        business_id: businessId,
        date: today,
        messages_sent: 1,
        messages_received: 0,
        missed_calls: 0,
        new_leads: 0,
        invoices_sent: 0,
        invoices_paid: 0,
        revenue_cents: 0,
        posts_published: 0,
        reviews_received: 0,
      })
  }
}

/**
 * Find or create a conversation for the given phone number
 */
async function getOrCreateConversation(
  db: SupabaseClient,
  businessId: string,
  toPhone: string
): Promise<string | null> {
  // Normalize phone number format
  const normalizedPhone = toPhone.startsWith('+') ? toPhone : `+1${toPhone.replace(/\D/g, '')}`

  // Check for existing conversation
  const { data: existing } = await db
    .from('conversations')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone', normalizedPhone)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new conversation
  const { data: newConv, error } = await db
    .from('conversations')
    .insert({
      business_id: businessId,
      phone: normalizedPhone,
      status: 'active',
      context: {},
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[SMS] Error creating conversation:', error)
    return null
  }

  return newConv.id
}

export async function POST(request: NextRequest): Promise<NextResponse<SendSmsResponse>> {
  try {
    const body: SendSmsRequest = await request.json()
    const { to, message, businessId, conversationId: providedConversationId } = body

    // Validate required fields
    if (!to || !message || !businessId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, message, businessId' },
        { status: 400 }
      )
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{9,14}$/
    const normalizedTo = to.replace(/[\s\-\(\)\.]/g, '')
    if (!phoneRegex.test(normalizedTo)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Validate message length (Twilio SMS limit awareness)
    if (message.length > 1600) {
      return NextResponse.json(
        { success: false, error: 'Message too long. Maximum 1600 characters.' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    // Verify authentication
    const authResult = await verifyAuthentication(request, db, businessId)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify business exists
    const { data: business, error: bizError } = await db
      .from('businesses')
      .select('id, name, is_paused')
      .eq('id', businessId)
      .single()

    if (bizError || !business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check if business is paused
    if (business.is_paused) {
      return NextResponse.json(
        { success: false, error: 'Business is paused. Cannot send messages.' },
        { status: 403 }
      )
    }

    // Check SMS usage limits
    const { checkUsageLimit, incrementUsage } = await import('@/lib/usage-limits')
    const usageCheck = await checkUsageLimit(businessId, 'sms', 1)
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: usageCheck.message || 'SMS limit reached for this billing period',
          usageInfo: {
            current: usageCheck.currentUsage,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
          },
        },
        { status: 429 }
      )
    }

    // Get Twilio client
    const twilio = await getTwilio()
    if (!twilio) {
      return NextResponse.json(
        { success: false, error: 'SMS service not configured' },
        { status: 503 }
      )
    }

    // Get business's Twilio number or fall back to default
    let fromNumber = await getBusinessTwilioNumber(db, businessId)
    if (!fromNumber) {
      fromNumber = process.env.TWILIO_PHONE_NUMBER || null
    }

    if (!fromNumber) {
      return NextResponse.json(
        { success: false, error: 'No sending phone number configured for this business' },
        { status: 503 }
      )
    }

    // Format the to number
    const formattedTo = normalizedTo.startsWith('+') ? normalizedTo : `+1${normalizedTo}`

    // Send SMS via Twilio
    let twilioResult
    try {
      twilioResult = await twilio.messages.create({
        body: message,
        from: fromNumber,
        to: formattedTo,
      })
    } catch (twilioError) {
      const errorMessage = twilioError instanceof Error ? twilioError.message : 'Failed to send SMS'
      console.error('[SMS] Twilio error:', twilioError)
      return NextResponse.json(
        { success: false, error: `SMS delivery failed: ${errorMessage}` },
        { status: 502 }
      )
    }

    // Get or create conversation for logging
    let conversationId: string | null = providedConversationId || null
    if (!conversationId) {
      conversationId = await getOrCreateConversation(db, businessId, formattedTo)
    }

    // Log the message if we have a conversation
    if (conversationId) {
      await logSentMessage(db, {
        conversationId,
        businessId,
        content: message,
        twilioSid: twilioResult.sid,
      })
    }

    // Update daily stats
    await updateDailyStats(db, businessId)

    // Increment monthly usage for billing
    await incrementUsage(businessId, 'sms', 1)

    console.log(`[SMS] Sent message to ${formattedTo} for business ${businessId}`)

    return NextResponse.json({
      success: true,
      messageId: twilioResult.sid,
    })

  } catch (error) {
    console.error('[SMS] Send error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// Prevent caching
export const dynamic = 'force-dynamic'
