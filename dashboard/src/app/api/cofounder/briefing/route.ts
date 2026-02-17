import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Initialize Supabase client lazily
let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

// Types matching the DailyBriefing component expectations
interface BriefingMetric {
  label: string
  value: string | number
  previousValue?: string | number
  change?: number
  changeLabel?: string
  icon: string // Icon name as string for API transport
  color: string
}

interface BriefingPriority {
  id: string
  title: string
  description: string
  urgency: 'high' | 'medium' | 'low'
  completed: boolean
  actionLabel?: string
  estimatedImpact?: string
}

interface BriefingResponse {
  greeting: string
  summary: string
  metrics: BriefingMetric[]
  priorities: BriefingPriority[]
  opportunities: string[]
  scheduledToday: number
  generatedAt: string
}

/**
 * GET /api/cofounder/briefing
 * Fetch the latest daily briefing for a business
 * Query params:
 *   - businessId: required
 *   - date: optional, specific date (YYYY-MM-DD), defaults to today or most recent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const dateParam = searchParams.get('date')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    // Get greeting based on time of day
    const now = new Date()
    const hour = now.getHours()
    let greeting = 'Good morning'
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon'
    if (hour >= 17) greeting = 'Good evening'

    // Fetch the latest briefing
    let briefing: any = null
    let error: any = null

    if (dateParam) {
      // Fetch specific date
      const result = await db
        .from('daily_briefings')
        .select('*')
        .eq('business_id', businessId)
        .eq('date', dateParam)
        .single()
      briefing = result.data
      error = result.error
    } else {
      // Fetch most recent
      const result = await db
        .from('daily_briefings')
        .select('*')
        .eq('business_id', businessId)
        .order('date', { ascending: false })
        .limit(1)
      briefing = result.data?.[0] || null
      error = result.error
    }

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is ok
      console.error('Error fetching briefing:', error)
      throw error
    }

    if (!briefing) {
      // No briefing found - try to generate real-time metrics instead
      const fallbackBriefing = await generateFallbackBriefing(db, businessId, greeting)

      if (fallbackBriefing) {
        return NextResponse.json({
          ...fallbackBriefing,
          isRealtime: true
        })
      }

      return NextResponse.json(
        { error: 'No briefing available', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Transform database format to component format
    const response: BriefingResponse = await transformBriefingData(
      db,
      businessId,
      briefing,
      greeting
    )

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in briefing API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch briefing' },
      { status: 500 }
    )
  }
}

/**
 * Transform database briefing format to component format
 */
async function transformBriefingData(
  db: SupabaseClient,
  businessId: string,
  briefing: any,
  greeting: string
): Promise<BriefingResponse> {
  const metrics = briefing.metrics || {}
  const dbPriorities = briefing.priorities || []
  const opportunities = briefing.opportunities || []

  // Fetch comparison data for metrics (previous day)
  const previousDate = new Date(briefing.date)
  previousDate.setDate(previousDate.getDate() - 1)
  const previousDateStr = previousDate.toISOString().split('T')[0]

  const { data: previousStats } = await db
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', previousDateStr)
    .single()

  // Build metrics array with comparisons
  const transformedMetrics: BriefingMetric[] = []

  // Revenue metric
  const currentRevenue = metrics.revenueCents || 0
  const previousRevenue = previousStats?.revenue_cents || 0
  const revenueChange = previousRevenue > 0
    ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
    : 0

  transformedMetrics.push({
    label: 'Revenue Today',
    value: `$${(currentRevenue / 100).toLocaleString()}`,
    previousValue: `$${(previousRevenue / 100).toLocaleString()}`,
    change: revenueChange,
    changeLabel: 'vs yesterday',
    icon: 'DollarSign',
    color: 'emerald'
  })

  // New Leads metric
  const currentLeads = metrics.newLeads || 0
  const previousLeads = previousStats?.new_leads || 0
  const leadsChange = previousLeads > 0
    ? Math.round(((currentLeads - previousLeads) / previousLeads) * 100)
    : 0

  transformedMetrics.push({
    label: 'New Leads',
    value: currentLeads,
    previousValue: previousLeads,
    change: leadsChange,
    changeLabel: 'vs yesterday',
    icon: 'Users',
    color: 'blue'
  })

  // Messages metric
  const currentMessages = (metrics.messagesReceived || 0) + (metrics.messagesSent || 0)
  const previousMessages = (previousStats?.messages_received || 0) + (previousStats?.messages_sent || 0)
  const messagesChange = previousMessages > 0
    ? Math.round(((currentMessages - previousMessages) / previousMessages) * 100)
    : 0

  transformedMetrics.push({
    label: 'Messages',
    value: currentMessages,
    previousValue: previousMessages,
    change: messagesChange,
    changeLabel: 'vs yesterday',
    icon: 'MessageSquare',
    color: 'amber'
  })

  // Invoices Paid metric
  const invoicesPaid = metrics.invoicesPaid || 0
  const previousInvoicesPaid = previousStats?.invoices_paid || 0
  const invoicesChange = previousInvoicesPaid > 0
    ? Math.round(((invoicesPaid - previousInvoicesPaid) / previousInvoicesPaid) * 100)
    : 0

  transformedMetrics.push({
    label: 'Invoices Paid',
    value: invoicesPaid,
    previousValue: previousInvoicesPaid,
    change: invoicesChange,
    changeLabel: 'vs yesterday',
    icon: 'Clock',
    color: 'purple'
  })

  // Transform priorities
  const transformedPriorities: BriefingPriority[] = dbPriorities.map((p: any, index: number) => {
    // If priorities are stored as strings, convert them
    if (typeof p === 'string') {
      return {
        id: `priority-${index + 1}`,
        title: p,
        description: '',
        urgency: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
        completed: false,
        actionLabel: 'Take action'
      }
    }
    // If already structured
    return {
      id: p.id || `priority-${index + 1}`,
      title: p.title || p,
      description: p.description || '',
      urgency: p.urgency || (index === 0 ? 'high' : index === 1 ? 'medium' : 'low'),
      completed: p.completed || false,
      actionLabel: p.actionLabel || 'Take action',
      estimatedImpact: p.estimatedImpact
    }
  })

  // Get scheduled appointments count
  const today = new Date().toISOString().split('T')[0]
  const { count: scheduledCount } = await db
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('scheduled_at', `${today}T00:00:00`)
    .lt('scheduled_at', `${today}T23:59:59`)

  return {
    greeting,
    summary: briefing.summary || briefing.ai_summary || 'Your daily business briefing is ready.',
    metrics: transformedMetrics,
    priorities: transformedPriorities,
    opportunities: Array.isArray(opportunities)
      ? opportunities.map((o: any) => typeof o === 'string' ? o : o.description || o.title || '')
      : [],
    scheduledToday: scheduledCount || 0,
    generatedAt: briefing.generated_at || briefing.created_at || new Date().toISOString()
  }
}

/**
 * Generate fallback briefing from real-time data when no pre-generated briefing exists
 */
async function generateFallbackBriefing(
  db: SupabaseClient,
  businessId: string,
  greeting: string
): Promise<BriefingResponse | null> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch today's and yesterday's stats
    const [todayStatsRes, yesterdayStatsRes] = await Promise.all([
      db.from('daily_stats')
        .select('*')
        .eq('business_id', businessId)
        .eq('date', today)
        .single(),
      db.from('daily_stats')
        .select('*')
        .eq('business_id', businessId)
        .eq('date', yesterday)
        .single()
    ])

    const todayStats = todayStatsRes.data || {}
    const yesterdayStats = yesterdayStatsRes.data || {}

    // Fetch open invoices
    const { data: openInvoices } = await db
      .from('invoices')
      .select('amount_cents, contact_name, sent_at')
      .eq('business_id', businessId)
      .in('status', ['sent', 'overdue'])
      .order('sent_at', { ascending: true })
      .limit(5)

    // Fetch recent leads that need follow-up
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: pendingLeads } = await db
      .from('contacts')
      .select('id, name, phone, created_at, status')
      .eq('business_id', businessId)
      .in('status', ['new', 'contacted'])
      .gte('created_at', threeDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5)

    // Fetch scheduled appointments
    const { data: appointments, count: scheduledCount } = await db
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .gte('scheduled_at', `${today}T00:00:00`)
      .lt('scheduled_at', `${today}T23:59:59`)

    // Build metrics
    const metrics: BriefingMetric[] = [
      {
        label: 'Revenue Today',
        value: `$${((todayStats.revenue_cents || 0) / 100).toLocaleString()}`,
        previousValue: `$${((yesterdayStats.revenue_cents || 0) / 100).toLocaleString()}`,
        change: calculateChange(todayStats.revenue_cents, yesterdayStats.revenue_cents),
        changeLabel: 'vs yesterday',
        icon: 'DollarSign',
        color: 'emerald'
      },
      {
        label: 'New Leads',
        value: todayStats.new_leads || 0,
        previousValue: yesterdayStats.new_leads || 0,
        change: calculateChange(todayStats.new_leads, yesterdayStats.new_leads),
        changeLabel: 'vs yesterday',
        icon: 'Users',
        color: 'blue'
      },
      {
        label: 'Messages',
        value: (todayStats.messages_received || 0) + (todayStats.messages_sent || 0),
        previousValue: (yesterdayStats.messages_received || 0) + (yesterdayStats.messages_sent || 0),
        change: calculateChange(
          (todayStats.messages_received || 0) + (todayStats.messages_sent || 0),
          (yesterdayStats.messages_received || 0) + (yesterdayStats.messages_sent || 0)
        ),
        changeLabel: 'vs yesterday',
        icon: 'MessageSquare',
        color: 'amber'
      },
      {
        label: 'Invoices Paid',
        value: todayStats.invoices_paid || 0,
        previousValue: yesterdayStats.invoices_paid || 0,
        change: calculateChange(todayStats.invoices_paid, yesterdayStats.invoices_paid),
        changeLabel: 'vs yesterday',
        icon: 'Clock',
        color: 'purple'
      }
    ]

    // Build priorities from real data
    const priorities: BriefingPriority[] = []

    // Add overdue invoices as priorities
    if (openInvoices && openInvoices.length > 0) {
      const totalOverdue = openInvoices.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0)
      priorities.push({
        id: 'invoice-followup',
        title: `Follow up on ${openInvoices.length} open invoice${openInvoices.length > 1 ? 's' : ''}`,
        description: `$${(totalOverdue / 100).toLocaleString()} in outstanding invoices need attention.`,
        urgency: 'high',
        completed: false,
        actionLabel: 'View invoices',
        estimatedImpact: `Recover $${(totalOverdue / 100).toLocaleString()}`
      })
    }

    // Add pending leads as priorities
    if (pendingLeads && pendingLeads.length > 0) {
      priorities.push({
        id: 'lead-followup',
        title: `Respond to ${pendingLeads.length} new lead${pendingLeads.length > 1 ? 's' : ''}`,
        description: 'New inquiries waiting for your response.',
        urgency: pendingLeads.length > 2 ? 'high' : 'medium',
        completed: false,
        actionLabel: 'View leads',
        estimatedImpact: `${pendingLeads.length} potential customers`
      })
    }

    // Add appointment confirmations if applicable
    if (scheduledCount && scheduledCount > 0) {
      priorities.push({
        id: 'confirm-appointments',
        title: `Confirm ${scheduledCount} appointment${scheduledCount > 1 ? 's' : ''} for today`,
        description: 'Send confirmation reminders to reduce no-shows.',
        urgency: 'medium',
        completed: false,
        actionLabel: 'View calendar'
      })
    }

    // Generate a basic summary
    const leadsText = (todayStats.new_leads || 0) > 0
      ? `${todayStats.new_leads} new leads so far`
      : 'No new leads yet'
    const revenueText = (todayStats.revenue_cents || 0) > 0
      ? `$${((todayStats.revenue_cents || 0) / 100).toLocaleString()} in revenue`
      : 'No revenue recorded yet'

    const summary = `Today you have ${leadsText} and ${revenueText}. ${
      priorities.length > 0
        ? `Focus on the ${priorities.length} priorit${priorities.length > 1 ? 'ies' : 'y'} below to maximize your day.`
        : 'Keep up the momentum!'
    }`

    return {
      greeting,
      summary,
      metrics,
      priorities,
      opportunities: [],
      scheduledToday: scheduledCount || 0,
      generatedAt: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error generating fallback briefing:', error)
    return null
  }
}

function calculateChange(current: number | undefined, previous: number | undefined): number {
  const curr = current || 0
  const prev = previous || 0
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

// Disable caching for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0
