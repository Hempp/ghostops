import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create client lazily to avoid build-time errors
let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured')
    }
    _supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }
  return _supabase
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase()
    const value = (client as unknown as Record<string, unknown>)[prop as string]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

// Business Operations
export async function getBusinessByTwilioNumber(twilioNumber: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('twilio_number', twilioNumber)
    .single()
  if (error) throw error
  return data
}

export async function getBusinessByStripeCustomer(stripeCustomerId: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .single()
  if (error) return null
  return data
}

export async function createBusiness(business: {
  owner_email: string
  owner_phone?: string
  owner_name?: string
  twilio_number: string
  stripe_customer_id: string
  subscription_id: string
}) {
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      ...business,
      subscription_status: 'active',
      onboarding_step: 'welcome',
      onboarding_complete: false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBusinessSubscription(
  stripeCustomerId: string,
  updates: {
    subscription_status?: string
    subscription_plan?: string
    subscription_id?: string
    subscription_current_period_end?: string
    subscription_canceled_at?: string
  }
) {
  const { error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('stripe_customer_id', stripeCustomerId)
  if (error) throw error
}

// Conversation Operations
export async function getOrCreateConversation(businessId: string, phone: string, source?: string) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .eq('status', 'active')
    .single()

  if (existing) {
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', existing.id)
    return existing
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      business_id: businessId,
      phone,
      status: 'active',
      context: source ? { source } : {},
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getRecentMessages(conversationId: string, limit = 20) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data?.reverse() || []
}

export async function saveMessage(message: {
  conversation_id: string
  business_id: string
  direction: 'inbound' | 'outbound'
  content: string
  media_urls?: string[]
  twilio_sid?: string
  ai_generated?: boolean
  metadata?: Record<string, unknown>
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()
  if (error) throw error
  return data
}

// Missed Call Operations
export async function recordMissedCall(missedCall: {
  business_id: string
  caller_phone: string
  twilio_call_sid?: string
}) {
  const { data, error } = await supabase
    .from('missed_calls')
    .insert(missedCall)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMissedCallStatus(
  businessId: string,
  phone: string,
  updates: { textback_sent?: boolean; conversation_id?: string }
) {
  await supabase
    .from('missed_calls')
    .update({ ...updates, textback_sent_at: new Date().toISOString() })
    .eq('business_id', businessId)
    .eq('caller_phone', phone)
    .is('textback_sent', false)
}

// Invoice Operations
export async function markInvoicePaid(paymentLinkId: string, amountPaid: number) {
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('stripe_payment_link', paymentLinkId)
  if (error) throw error
}

// Stats Operations
export async function updateDailyStats(
  businessId: string,
  field: string,
  increment = 1
) {
  const date = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', date)
    .single()

  if (existing) {
    const currentValue = (existing as Record<string, number>)[field] || 0
    await supabase
      .from('daily_stats')
      .update({ [field]: currentValue + increment })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('daily_stats')
      .insert({ business_id: businessId, date, [field]: increment })
  }
}

export async function getMonthlyStats(businessId: string) {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const { data } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .gte('date', startOfMonth)

  return (data || []).reduce(
    (acc, d) => ({
      messages: acc.messages + (d.messages_sent || 0) + (d.messages_received || 0),
      missedCalls: acc.missedCalls + (d.missed_calls || 0),
      newLeads: acc.newLeads + (d.new_leads || 0),
      revenue: acc.revenue + (d.revenue_cents || 0),
    }),
    { messages: 0, missedCalls: 0, newLeads: 0, revenue: 0 }
  )
}

export async function getMonthlyInvoices(businessId: string) {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startOfMonth)

  const invoices = data || []
  return {
    totalRevenue: invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + (i.amount_cents || 0), 0),
    unpaidTotal: invoices
      .filter((i) => i.status !== 'paid')
      .reduce((s, i) => s + (i.amount_cents || 0), 0),
    unpaidCount: invoices.filter((i) => i.status !== 'paid').length,
  }
}
