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

// Types for cron job results
interface CronCheckResult {
  overdueInvoices: OverdueInvoiceAlert[]
  newLeads: NewLeadAlert[]
  unansweredMessages: UnansweredMessageAlert[]
  cashFlowAlerts: CashFlowAlert[]
}

interface OverdueInvoiceAlert {
  invoiceId: string
  businessId: string
  contactName: string
  contactPhone: string
  amountCents: number
  daysSinceInvoiced: number
}

interface NewLeadAlert {
  contactId: string
  businessId: string
  name: string
  phone: string
  source: string
  createdAt: string
}

interface UnansweredMessageAlert {
  conversationId: string
  businessId: string
  contactPhone: string
  contactName: string | null
  lastMessageAt: string
  hoursSinceMessage: number
}

interface CashFlowAlert {
  businessId: string
  businessName: string
  totalOutstanding: number
  overdueCount: number
  message: string
}

interface QueuedAction {
  business_id: string
  action_type: 'payment_reminder' | 'lead_alert' | 'unanswered_message_alert' | 'cash_flow_alert'
  payload: Record<string, unknown>
  status: 'pending' | 'processed' | 'failed'
  created_at: string
}

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('[CRON] Hourly check started at', new Date().toISOString())

  // Verify this is called by Vercel cron
  if (!verifyCronSecret(request)) {
    console.error('[CRON] Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getSupabase()
    const results: CronCheckResult = {
      overdueInvoices: [],
      newLeads: [],
      unansweredMessages: [],
      cashFlowAlerts: []
    }

    // Get all active businesses
    const { data: businesses, error: bizError } = await db
      .from('businesses')
      .select('id, name, owner_phone, is_paused, features_enabled, settings')
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

    console.log(`[CRON] Processing ${businesses.length} active businesses`)

    // Process each business
    for (const business of businesses) {
      try {
        // 1. Check for overdue invoices (3+ days)
        const overdueInvoices = await checkOverdueInvoices(db, business.id)
        results.overdueInvoices.push(...overdueInvoices)

        // 2. Check for new leads in last hour
        const newLeads = await checkNewLeads(db, business.id)
        results.newLeads.push(...newLeads)

        // 3. Check for unanswered messages (2+ hours)
        const unansweredMessages = await checkUnansweredMessages(db, business.id)
        results.unansweredMessages.push(...unansweredMessages)

        // 4. Monitor cash flow thresholds
        const cashFlowAlert = await checkCashFlow(db, business.id, business.name)
        if (cashFlowAlert) {
          results.cashFlowAlerts.push(cashFlowAlert)
        }
      } catch (bizProcessError) {
        console.error(`[CRON] Error processing business ${business.id}:`, bizProcessError)
        // Continue processing other businesses
      }
    }

    // Queue actions for alerts
    const actionsQueued = await queueAlertActions(db, results)

    const duration = Date.now() - startTime
    console.log(`[CRON] Hourly check completed in ${duration}ms`)
    console.log(`[CRON] Results: ${results.overdueInvoices.length} overdue invoices, ${results.newLeads.length} new leads, ${results.unansweredMessages.length} unanswered messages, ${results.cashFlowAlerts.length} cash flow alerts`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        businessesProcessed: businesses.length,
        overdueInvoices: results.overdueInvoices.length,
        newLeads: results.newLeads.length,
        unansweredMessages: results.unansweredMessages.length,
        cashFlowAlerts: results.cashFlowAlerts.length,
        actionsQueued
      }
    })

  } catch (error) {
    console.error('[CRON] Hourly check failed:', error)
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

async function checkOverdueInvoices(
  db: SupabaseClient,
  businessId: string
): Promise<OverdueInvoiceAlert[]> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invoices, error } = await db
    .from('invoices')
    .select('id, contact_name, contact_phone, amount_cents, sent_at, created_at')
    .eq('business_id', businessId)
    .in('status', ['sent', 'overdue'])
    .lt('sent_at', threeDaysAgo)

  if (error) {
    console.error(`[CRON] Error checking overdue invoices for ${businessId}:`, error)
    return []
  }

  if (!invoices) return []

  return invoices.map(invoice => {
    const sentDate = new Date(invoice.sent_at || invoice.created_at)
    const daysSince = Math.floor((Date.now() - sentDate.getTime()) / (24 * 60 * 60 * 1000))

    return {
      invoiceId: invoice.id,
      businessId,
      contactName: invoice.contact_name || 'Unknown',
      contactPhone: invoice.contact_phone,
      amountCents: invoice.amount_cents,
      daysSinceInvoiced: daysSince
    }
  })
}

async function checkNewLeads(
  db: SupabaseClient,
  businessId: string
): Promise<NewLeadAlert[]> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: contacts, error } = await db
    .from('contacts')
    .select('id, name, phone, source, created_at')
    .eq('business_id', businessId)
    .gte('created_at', oneHourAgo)

  if (error) {
    console.error(`[CRON] Error checking new leads for ${businessId}:`, error)
    return []
  }

  if (!contacts) return []

  return contacts.map(contact => ({
    contactId: contact.id,
    businessId,
    name: contact.name || 'Unknown',
    phone: contact.phone,
    source: contact.source || 'direct',
    createdAt: contact.created_at
  }))
}

async function checkUnansweredMessages(
  db: SupabaseClient,
  businessId: string
): Promise<UnansweredMessageAlert[]> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  // Get conversations with recent inbound messages that haven't been replied to
  const { data: conversations, error } = await db
    .from('conversations')
    .select(`
      id,
      phone,
      last_message_at,
      contacts (name)
    `)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .lt('last_message_at', twoHoursAgo)

  if (error) {
    console.error(`[CRON] Error checking unanswered messages for ${businessId}:`, error)
    return []
  }

  if (!conversations) return []

  const alerts: UnansweredMessageAlert[] = []

  for (const conv of conversations) {
    // Check if the last message was inbound (from customer)
    const { data: lastMessage, error: msgError } = await db
      .from('messages')
      .select('direction, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (msgError || !lastMessage) continue

    // Only alert if the last message was inbound (customer waiting for response)
    if (lastMessage.direction === 'inbound') {
      const hoursSince = Math.floor(
        (Date.now() - new Date(lastMessage.created_at).getTime()) / (60 * 60 * 1000)
      )

      if (hoursSince >= 2) {
        // Handle both single contact object and array of contacts
        const contactsData = conv.contacts
        const contactName = Array.isArray(contactsData)
          ? (contactsData[0] as { name: string | null } | undefined)?.name || null
          : (contactsData as { name: string | null } | null)?.name || null
        alerts.push({
          conversationId: conv.id,
          businessId,
          contactPhone: conv.phone,
          contactName,
          lastMessageAt: lastMessage.created_at,
          hoursSinceMessage: hoursSince
        })
      }
    }
  }

  return alerts
}

async function checkCashFlow(
  db: SupabaseClient,
  businessId: string,
  businessName: string | null
): Promise<CashFlowAlert | null> {
  const { data: unpaidInvoices, error } = await db
    .from('invoices')
    .select('amount_cents, sent_at, status')
    .eq('business_id', businessId)
    .in('status', ['sent', 'overdue'])

  if (error) {
    console.error(`[CRON] Error checking cash flow for ${businessId}:`, error)
    return null
  }

  if (!unpaidInvoices || unpaidInvoices.length === 0) return null

  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0)
  const overdueCount = unpaidInvoices.filter(inv => inv.status === 'overdue').length

  // Alert thresholds
  const OUTSTANDING_THRESHOLD = 500000 // $5,000 in cents
  const OVERDUE_COUNT_THRESHOLD = 5

  if (totalOutstanding >= OUTSTANDING_THRESHOLD || overdueCount >= OVERDUE_COUNT_THRESHOLD) {
    let message = ''

    if (totalOutstanding >= OUTSTANDING_THRESHOLD) {
      message = `Outstanding AR of $${(totalOutstanding / 100).toFixed(0)} exceeds $${OUTSTANDING_THRESHOLD / 100} threshold.`
    }

    if (overdueCount >= OVERDUE_COUNT_THRESHOLD) {
      message += ` ${overdueCount} overdue invoices need attention.`
    }

    return {
      businessId,
      businessName: businessName || 'Unknown Business',
      totalOutstanding: totalOutstanding / 100,
      overdueCount,
      message: message.trim()
    }
  }

  return null
}

async function queueAlertActions(
  db: SupabaseClient,
  results: CronCheckResult
): Promise<number> {
  const actions: QueuedAction[] = []
  const now = new Date().toISOString()

  // Queue payment reminders for overdue invoices
  for (const invoice of results.overdueInvoices) {
    actions.push({
      business_id: invoice.businessId,
      action_type: 'payment_reminder',
      payload: {
        invoiceId: invoice.invoiceId,
        contactName: invoice.contactName,
        contactPhone: invoice.contactPhone,
        amountCents: invoice.amountCents,
        daysSinceInvoiced: invoice.daysSinceInvoiced
      },
      status: 'pending',
      created_at: now
    })
  }

  // Queue lead alerts
  for (const lead of results.newLeads) {
    actions.push({
      business_id: lead.businessId,
      action_type: 'lead_alert',
      payload: {
        contactId: lead.contactId,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        createdAt: lead.createdAt
      },
      status: 'pending',
      created_at: now
    })
  }

  // Queue unanswered message alerts
  for (const msg of results.unansweredMessages) {
    actions.push({
      business_id: msg.businessId,
      action_type: 'unanswered_message_alert',
      payload: {
        conversationId: msg.conversationId,
        contactPhone: msg.contactPhone,
        contactName: msg.contactName,
        lastMessageAt: msg.lastMessageAt,
        hoursSinceMessage: msg.hoursSinceMessage
      },
      status: 'pending',
      created_at: now
    })
  }

  // Queue cash flow alerts
  for (const alert of results.cashFlowAlerts) {
    actions.push({
      business_id: alert.businessId,
      action_type: 'cash_flow_alert',
      payload: {
        businessName: alert.businessName,
        totalOutstanding: alert.totalOutstanding,
        overdueCount: alert.overdueCount,
        message: alert.message
      },
      status: 'pending',
      created_at: now
    })
  }

  if (actions.length === 0) {
    return 0
  }

  // Insert actions into the queued_actions table
  const { error } = await db
    .from('queued_actions')
    .insert(actions)

  if (error) {
    console.error('[CRON] Error queueing actions:', error)
    // If table doesn't exist, log but don't fail
    if (error.code === '42P01') {
      console.warn('[CRON] queued_actions table does not exist - skipping action queueing')
      return 0
    }
    throw error
  }

  console.log(`[CRON] Queued ${actions.length} actions`)
  return actions.length
}

// Ensure this route is not cached
export const dynamic = 'force-dynamic'
export const revalidate = 0
