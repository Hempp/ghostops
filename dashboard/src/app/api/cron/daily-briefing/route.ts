import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Initialize clients lazily at runtime
let anthropic: Anthropic | null = null
let supabase: SupabaseClient | null = null

function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropic
}

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

// Types for daily briefing
interface DailyMetrics {
  date: string
  newLeads: number
  messagesReceived: number
  messagesSent: number
  invoicesSent: number
  invoicesPaid: number
  revenueCents: number
  missedCalls: number
  postsPublished: number
  reviewsReceived: number
}

interface BusinessBriefing {
  businessId: string
  businessName: string
  businessType: string
  metrics: DailyMetrics
  openInvoices: {
    count: number
    totalCents: number
    oldestDays: number
  }
  activePipeline: {
    newLeads: number
    activeConversations: number
    hotLeads: number
  }
  aiSummary: string
  priorities: string[]
  createdAt: string
}

// Verify cron request from Vercel
function verifyCronRequest(request: NextRequest): boolean {
  // Method 1: Check for Vercel cron signature header (set automatically by Vercel)
  const vercelCronSignature = request.headers.get('x-vercel-cron-signature')
  if (vercelCronSignature) {
    // Vercel sends this header for cron requests - presence indicates valid cron call
    return true
  }

  // Method 2: Check for CRON_SECRET in Authorization header (for manual/testing)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  // Method 3: Check for CRON_SECRET as query parameter (fallback)
  const url = new URL(request.url)
  const secretParam = url.searchParams.get('secret')
  if (cronSecret && secretParam === cronSecret) {
    return true
  }

  console.warn('CRON request verification failed: no valid signature or secret')
  return false
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('[CRON] Daily briefing started at', new Date().toISOString())

  // Verify this is called by Vercel cron or authorized request
  if (!verifyCronRequest(request)) {
    console.error('[CRON] Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getSupabase()
    const ai = getAnthropic()
    const briefingsGenerated: string[] = []

    // Get all active businesses with morning briefing enabled
    const { data: businesses, error: bizError } = await db
      .from('businesses')
      .select('id, name, business_type, owner_phone, is_paused, features_enabled')
      .eq('is_paused', false)

    if (bizError) {
      console.error('[CRON] Error fetching businesses:', bizError)
      throw bizError
    }

    if (!businesses || businesses.length === 0) {
      console.log('[CRON] No active businesses found')
      return NextResponse.json({
        success: true,
        message: 'No active businesses to process',
        duration: Date.now() - startTime
      })
    }

    console.log(`[CRON] Generating briefings for ${businesses.length} businesses`)

    // Process each business
    for (const business of businesses) {
      try {
        // Check if morning briefing is enabled for this business
        const features = business.features_enabled || {}
        if (features.morning_briefing === false) {
          console.log(`[CRON] Morning briefing disabled for ${business.id}`)
          continue
        }

        const briefing = await generateDailyBriefing(
          db,
          ai,
          business.id,
          business.name || 'Your Business',
          business.business_type || 'general'
        )

        if (briefing) {
          // Store briefing in database
          await storeBriefing(db, briefing)
          briefingsGenerated.push(business.id)
        }
      } catch (bizError) {
        console.error(`[CRON] Error generating briefing for ${business.id}:`, bizError)
        // Continue processing other businesses
      }
    }

    const duration = Date.now() - startTime
    console.log(`[CRON] Daily briefing completed in ${duration}ms`)
    console.log(`[CRON] Generated ${briefingsGenerated.length} briefings`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        businessesProcessed: businesses.length,
        briefingsGenerated: briefingsGenerated.length,
        businessIds: briefingsGenerated
      }
    })

  } catch (error) {
    console.error('[CRON] Daily briefing failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

async function generateDailyBriefing(
  db: SupabaseClient,
  ai: Anthropic,
  businessId: string,
  businessName: string,
  businessType: string
): Promise<BusinessBriefing | null> {
  // Get yesterday's date
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Fetch yesterday's metrics
  const { data: statsData } = await db
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', yesterdayStr)
    .single()

  const metrics: DailyMetrics = {
    date: yesterdayStr,
    newLeads: statsData?.new_leads || 0,
    messagesReceived: statsData?.messages_received || 0,
    messagesSent: statsData?.messages_sent || 0,
    invoicesSent: statsData?.invoices_sent || 0,
    invoicesPaid: statsData?.invoices_paid || 0,
    revenueCents: statsData?.revenue_cents || 0,
    missedCalls: statsData?.missed_calls || 0,
    postsPublished: statsData?.posts_published || 0,
    reviewsReceived: statsData?.reviews_received || 0
  }

  // Fetch open invoices
  const { data: invoices } = await db
    .from('invoices')
    .select('amount_cents, sent_at, created_at')
    .eq('business_id', businessId)
    .in('status', ['sent', 'overdue'])

  const openInvoices = {
    count: invoices?.length || 0,
    totalCents: invoices?.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) || 0,
    oldestDays: 0
  }

  if (invoices && invoices.length > 0) {
    const oldestDate = invoices.reduce((oldest, inv) => {
      const date = new Date(inv.sent_at || inv.created_at)
      return date < oldest ? date : oldest
    }, new Date())
    openInvoices.oldestDays = Math.floor((Date.now() - oldestDate.getTime()) / (24 * 60 * 60 * 1000))
  }

  // Fetch active pipeline
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [recentLeadsRes, activeConvRes] = await Promise.all([
    db.from('contacts')
      .select('id, status')
      .eq('business_id', businessId)
      .gte('created_at', thirtyDaysAgo),
    db.from('conversations')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'active')
  ])

  const recentLeads = recentLeadsRes.data || []
  const activeConversations = activeConvRes.data || []

  const activePipeline = {
    newLeads: recentLeads.filter(l => l.status === 'new' || !l.status).length,
    activeConversations: activeConversations.length,
    hotLeads: recentLeads.filter(l => l.status === 'hot' || l.status === 'qualified').length
  }

  // Generate AI summary and priorities
  const { summary, priorities } = await generateAISummary(
    ai,
    businessName,
    businessType,
    metrics,
    openInvoices,
    activePipeline
  )

  return {
    businessId,
    businessName,
    businessType,
    metrics,
    openInvoices,
    activePipeline,
    aiSummary: summary,
    priorities,
    createdAt: new Date().toISOString()
  }
}

async function generateAISummary(
  ai: Anthropic,
  businessName: string,
  businessType: string,
  metrics: DailyMetrics,
  openInvoices: { count: number; totalCents: number; oldestDays: number },
  activePipeline: { newLeads: number; activeConversations: number; hotLeads: number }
): Promise<{ summary: string; priorities: string[] }> {
  const prompt = `You are an AI co-founder providing a morning briefing for "${businessName}" (${businessType} business).

Yesterday's Performance:
- New Leads: ${metrics.newLeads}
- Messages: ${metrics.messagesReceived} received, ${metrics.messagesSent} sent
- Invoices: ${metrics.invoicesSent} sent, ${metrics.invoicesPaid} paid
- Revenue: $${(metrics.revenueCents / 100).toFixed(2)}
- Missed Calls: ${metrics.missedCalls}
- Social Posts: ${metrics.postsPublished}
- Reviews: ${metrics.reviewsReceived}

Cash Position:
- Open Invoices: ${openInvoices.count} worth $${(openInvoices.totalCents / 100).toFixed(2)}
- Oldest Invoice: ${openInvoices.oldestDays} days

Active Pipeline:
- New Leads (30d): ${activePipeline.newLeads}
- Active Conversations: ${activePipeline.activeConversations}
- Hot/Qualified Leads: ${activePipeline.hotLeads}

Provide:
1. A brief 2-3 sentence executive summary of yesterday's performance. Be direct and specific.
2. Exactly 3 prioritized action items for today. Each should be specific and actionable.

Format your response as JSON:
{
  "summary": "Your executive summary here",
  "priorities": ["Priority 1", "Priority 2", "Priority 3"]
}`

  try {
    const response = await ai.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON')
    }

    const parsed = JSON.parse(jsonMatch[0]) as { summary: string; priorities: string[] }
    return {
      summary: parsed.summary || 'Unable to generate summary.',
      priorities: parsed.priorities || ['Review yesterday\'s metrics', 'Follow up on open leads', 'Check outstanding invoices']
    }
  } catch (error) {
    console.error('[CRON] Error generating AI summary:', error)
    // Return fallback summary
    return {
      summary: `Yesterday ${businessName} received ${metrics.newLeads} new leads and processed ${metrics.messagesReceived + metrics.messagesSent} messages. Revenue was $${(metrics.revenueCents / 100).toFixed(2)}.`,
      priorities: [
        openInvoices.count > 0 ? `Follow up on ${openInvoices.count} open invoices ($${(openInvoices.totalCents / 100).toFixed(0)} outstanding)` : 'Review invoice status',
        activePipeline.newLeads > 0 ? `Engage ${activePipeline.newLeads} new leads` : 'Focus on lead generation',
        'Review and respond to active conversations'
      ]
    }
  }
}

async function storeBriefing(db: SupabaseClient, briefing: BusinessBriefing): Promise<void> {
  const { error } = await db
    .from('daily_briefings')
    .upsert({
      business_id: briefing.businessId,
      date: briefing.metrics.date,
      metrics: briefing.metrics,
      open_invoices: briefing.openInvoices,
      active_pipeline: briefing.activePipeline,
      ai_summary: briefing.aiSummary,
      priorities: briefing.priorities,
      created_at: briefing.createdAt
    }, {
      onConflict: 'business_id,date'
    })

  if (error) {
    // If table doesn't exist, log but don't fail
    if (error.code === '42P01') {
      console.warn('[CRON] daily_briefings table does not exist - attempting to store in alternate location')

      // Try storing in a more generic table if available
      const { error: altError } = await db
        .from('notifications')
        .insert({
          business_id: briefing.businessId,
          type: 'daily_briefing',
          title: `Daily Briefing - ${briefing.metrics.date}`,
          content: briefing.aiSummary,
          metadata: {
            metrics: briefing.metrics,
            openInvoices: briefing.openInvoices,
            activePipeline: briefing.activePipeline,
            priorities: briefing.priorities
          },
          created_at: briefing.createdAt
        })

      if (altError && altError.code !== '42P01') {
        console.error('[CRON] Error storing briefing in alternate table:', altError)
      }
      return
    }

    console.error('[CRON] Error storing briefing:', error)
    throw error
  }

  console.log(`[CRON] Stored briefing for ${briefing.businessId} - ${briefing.metrics.date}`)
}

// Ensure this route is not cached
export const dynamic = 'force-dynamic'
export const revalidate = 0
