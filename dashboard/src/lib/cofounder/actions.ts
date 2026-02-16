import Anthropic from '@anthropic-ai/sdk'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization for serverless environment
let anthropic: Anthropic | null = null
let supabase: SupabaseClient | null = null

function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropic
}

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

// Types
export type ActionType =
  | 'payment_reminder'
  | 'lead_response'
  | 'review_reply'
  | 'schedule_optimization'
  | 'alert'

export type ActionStatus = 'pending' | 'approved' | 'executed' | 'rejected'

export interface CoFounderAction {
  id: string
  business_id: string
  type: ActionType
  status: ActionStatus
  reasoning: string
  details: ActionDetails
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  executed_at?: string
  execution_result?: ExecutionResult
}

export interface ActionDetails {
  // Payment reminder
  invoice_id?: string
  contact_name?: string
  contact_phone?: string
  amount_cents?: number
  days_overdue?: number
  suggested_message?: string

  // Lead response
  lead_id?: string
  lead_source?: string
  conversation_id?: string
  lead_context?: string
  suggested_response?: string

  // Review reply
  review_id?: string
  review_platform?: string
  review_rating?: number
  review_text?: string
  suggested_reply?: string

  // Schedule optimization
  optimization_type?: string
  current_state?: string
  suggested_change?: string
  expected_impact?: string

  // Alert
  alert_category?: string
  alert_message?: string
  alert_data?: Record<string, unknown>
}

export interface ExecutionResult {
  success: boolean
  message: string
  timestamp: string
  external_id?: string // Twilio message SID, etc.
}

export interface Invoice {
  id: string
  business_id: string
  contact_phone: string
  contact_name: string | null
  amount_cents: number
  description: string
  status: string
  sent_at: string | null
  created_at: string
}

export interface Contact {
  id: string
  business_id: string
  name: string | null
  phone: string
  email: string | null
  source: string | null
  status: string | null
  created_at: string
}

export interface Conversation {
  id: string
  business_id: string
  contact_id: string | null
  phone: string
  status: string
  context: Record<string, unknown>
  last_message_at: string
  created_at: string
}

export interface Review {
  id: string
  business_id: string
  platform: string
  rating: number
  reviewer_name: string | null
  review_text: string
  replied: boolean
  created_at: string
}

// Helper to generate UUID
function generateId(): string {
  return crypto.randomUUID()
}

// AI reasoning generation
async function generateAIReasoning(
  prompt: string,
  businessContext: Record<string, unknown>
): Promise<{ reasoning: string; suggestedContent: string }> {
  const systemPrompt = `You are an AI Co-Founder assistant that helps small business owners automate tasks.
Your job is to explain WHY you recommend taking a specific action and provide the content for that action.

Business Context:
${JSON.stringify(businessContext, null, 2)}

Respond in JSON format with two fields:
1. "reasoning": A clear, concise explanation (2-3 sentences) of why this action is recommended, referencing specific data points
2. "suggestedContent": The actual message/content to use for this action

Keep the tone professional but friendly. Be specific about the business benefits.`

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        reasoning: parsed.reasoning || 'Action recommended based on business data.',
        suggestedContent: parsed.suggestedContent || ''
      }
    }

    return {
      reasoning: textContent.text.slice(0, 200),
      suggestedContent: ''
    }
  } catch (error) {
    console.error('AI reasoning generation error:', error)
    return {
      reasoning: 'Action recommended based on business data analysis.',
      suggestedContent: ''
    }
  }
}

// Calculate priority based on context
function calculatePriority(
  type: ActionType,
  details: ActionDetails
): 'low' | 'medium' | 'high' | 'urgent' {
  if (type === 'payment_reminder') {
    const daysOverdue = details.days_overdue || 0
    const amount = (details.amount_cents || 0) / 100

    if (daysOverdue > 30 && amount > 500) return 'urgent'
    if (daysOverdue > 14 || amount > 1000) return 'high'
    if (daysOverdue > 7) return 'medium'
    return 'low'
  }

  if (type === 'lead_response') {
    // Speed to lead is critical - new leads should be high priority
    return 'high'
  }

  if (type === 'review_reply') {
    const rating = details.review_rating || 5
    if (rating <= 2) return 'urgent' // Negative reviews need fast response
    if (rating <= 3) return 'high'
    return 'medium'
  }

  if (type === 'alert') {
    return 'high'
  }

  return 'medium'
}

// ============ ACTION GENERATORS ============

export async function generatePaymentReminder(
  invoice: Invoice,
  businessName?: string
): Promise<CoFounderAction> {
  const db = getSupabase()

  const sentDate = invoice.sent_at ? new Date(invoice.sent_at) : new Date(invoice.created_at)
  const daysOverdue = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24))

  const { reasoning, suggestedContent } = await generateAIReasoning(
    `Generate a payment reminder for an invoice:
- Customer: ${invoice.contact_name || 'Customer'}
- Amount: $${(invoice.amount_cents / 100).toFixed(2)}
- Description: ${invoice.description || 'Services'}
- Days outstanding: ${daysOverdue}
- Business name: ${businessName || 'Our business'}

Create a friendly but professional SMS payment reminder. Keep it under 160 characters if possible.`,
    {
      invoiceAmount: invoice.amount_cents / 100,
      daysOverdue,
      customerName: invoice.contact_name
    }
  )

  const action: CoFounderAction = {
    id: generateId(),
    business_id: invoice.business_id,
    type: 'payment_reminder',
    status: 'pending',
    reasoning,
    details: {
      invoice_id: invoice.id,
      contact_name: invoice.contact_name ?? undefined,
      contact_phone: invoice.contact_phone,
      amount_cents: invoice.amount_cents,
      days_overdue: daysOverdue,
      suggested_message: suggestedContent
    },
    priority: calculatePriority('payment_reminder', {
      days_overdue: daysOverdue,
      amount_cents: invoice.amount_cents
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Store in database
  const { error } = await db
    .from('cofounder_actions')
    .insert({
      id: action.id,
      business_id: action.business_id,
      type: action.type,
      status: action.status,
      reasoning: action.reasoning,
      details: action.details,
      priority: action.priority,
      created_at: action.created_at,
      updated_at: action.updated_at
    })

  if (error) {
    console.error('Error storing action:', error)
    throw new Error('Failed to store action')
  }

  return action
}

export async function generateLeadResponse(
  contact: Contact,
  conversation: Conversation | null,
  recentMessages?: string[]
): Promise<CoFounderAction> {
  const db = getSupabase()

  const leadContext = recentMessages?.join('\n') || 'New lead, no conversation yet.'

  const { reasoning, suggestedContent } = await generateAIReasoning(
    `Generate a response for a new lead:
- Lead name: ${contact.name || 'Unknown'}
- Lead source: ${contact.source || 'Direct'}
- Lead phone: ${contact.phone}
- Recent conversation context: ${leadContext}

Create a warm, professional response to engage this lead. Ask a qualifying question if appropriate.`,
    {
      leadName: contact.name,
      leadSource: contact.source,
      hasConversation: !!conversation
    }
  )

  const action: CoFounderAction = {
    id: generateId(),
    business_id: contact.business_id,
    type: 'lead_response',
    status: 'pending',
    reasoning,
    details: {
      lead_id: contact.id,
      contact_name: contact.name ?? undefined,
      contact_phone: contact.phone,
      lead_source: contact.source ?? undefined,
      conversation_id: conversation?.id,
      lead_context: leadContext,
      suggested_response: suggestedContent
    },
    priority: 'high', // Speed to lead is always high priority
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { error } = await db
    .from('cofounder_actions')
    .insert({
      id: action.id,
      business_id: action.business_id,
      type: action.type,
      status: action.status,
      reasoning: action.reasoning,
      details: action.details,
      priority: action.priority,
      created_at: action.created_at,
      updated_at: action.updated_at
    })

  if (error) {
    console.error('Error storing action:', error)
    throw new Error('Failed to store action')
  }

  return action
}

export async function generateReviewReply(
  review: Review,
  businessName?: string
): Promise<CoFounderAction> {
  const db = getSupabase()

  const sentimentLabel = review.rating >= 4 ? 'positive' : review.rating >= 3 ? 'neutral' : 'negative'

  const { reasoning, suggestedContent } = await generateAIReasoning(
    `Generate a reply to a customer review:
- Platform: ${review.platform}
- Rating: ${review.rating}/5 stars
- Reviewer: ${review.reviewer_name || 'Customer'}
- Review text: "${review.review_text}"
- Business name: ${businessName || 'Our business'}
- Sentiment: ${sentimentLabel}

Create an appropriate public reply. For negative reviews, acknowledge concerns and offer to resolve offline. For positive reviews, thank them warmly.`,
    {
      rating: review.rating,
      platform: review.platform,
      sentiment: sentimentLabel
    }
  )

  const action: CoFounderAction = {
    id: generateId(),
    business_id: review.business_id,
    type: 'review_reply',
    status: 'pending',
    reasoning,
    details: {
      review_id: review.id,
      review_platform: review.platform,
      review_rating: review.rating,
      review_text: review.review_text,
      suggested_reply: suggestedContent
    },
    priority: calculatePriority('review_reply', { review_rating: review.rating }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { error } = await db
    .from('cofounder_actions')
    .insert({
      id: action.id,
      business_id: action.business_id,
      type: action.type,
      status: action.status,
      reasoning: action.reasoning,
      details: action.details,
      priority: action.priority,
      created_at: action.created_at,
      updated_at: action.updated_at
    })

  if (error) {
    console.error('Error storing action:', error)
    throw new Error('Failed to store action')
  }

  return action
}

export async function generateAlert(
  businessId: string,
  category: string,
  message: string,
  data?: Record<string, unknown>
): Promise<CoFounderAction> {
  const db = getSupabase()

  const action: CoFounderAction = {
    id: generateId(),
    business_id: businessId,
    type: 'alert',
    status: 'pending',
    reasoning: `Alert generated: ${message}`,
    details: {
      alert_category: category,
      alert_message: message,
      alert_data: data
    },
    priority: 'high',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { error } = await db
    .from('cofounder_actions')
    .insert({
      id: action.id,
      business_id: action.business_id,
      type: action.type,
      status: action.status,
      reasoning: action.reasoning,
      details: action.details,
      priority: action.priority,
      created_at: action.created_at,
      updated_at: action.updated_at
    })

  if (error) {
    console.error('Error storing action:', error)
    throw new Error('Failed to store action')
  }

  return action
}

// ============ ACTION MANAGEMENT ============

export async function getPendingActions(
  businessId: string,
  filters?: {
    type?: ActionType
    status?: ActionStatus
    priority?: string
    limit?: number
  }
): Promise<CoFounderAction[]> {
  const db = getSupabase()

  let query = db
    .from('cofounder_actions')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  } else {
    // Default to pending
    query = query.eq('status', 'pending')
  }

  if (filters?.priority) {
    query = query.eq('priority', filters.priority)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching actions:', error)
    throw new Error('Failed to fetch actions')
  }

  return data as CoFounderAction[]
}

export async function getActionById(actionId: string): Promise<CoFounderAction | null> {
  const db = getSupabase()

  const { data, error } = await db
    .from('cofounder_actions')
    .select('*')
    .eq('id', actionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching action:', error)
    throw new Error('Failed to fetch action')
  }

  return data as CoFounderAction
}

export async function updateActionStatus(
  actionId: string,
  status: ActionStatus,
  executionResult?: ExecutionResult
): Promise<CoFounderAction> {
  const db = getSupabase()

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString()
  }

  if (status === 'executed' && executionResult) {
    updateData.executed_at = executionResult.timestamp
    updateData.execution_result = executionResult
  }

  const { data, error } = await db
    .from('cofounder_actions')
    .update(updateData)
    .eq('id', actionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating action:', error)
    throw new Error('Failed to update action')
  }

  return data as CoFounderAction
}

export async function approveAction(actionId: string): Promise<CoFounderAction> {
  return updateActionStatus(actionId, 'approved')
}

export async function rejectAction(actionId: string): Promise<CoFounderAction> {
  return updateActionStatus(actionId, 'rejected')
}

export async function bulkApproveActions(actionIds: string[]): Promise<void> {
  const db = getSupabase()

  const { error } = await db
    .from('cofounder_actions')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString()
    })
    .in('id', actionIds)

  if (error) {
    console.error('Error bulk approving actions:', error)
    throw new Error('Failed to bulk approve actions')
  }
}

// ============ ACTION EXECUTION ============

export async function executeAction(actionId: string): Promise<ExecutionResult> {
  const action = await getActionById(actionId)

  if (!action) {
    throw new Error('Action not found')
  }

  if (action.status !== 'approved') {
    throw new Error('Action must be approved before execution')
  }

  let result: ExecutionResult

  try {
    switch (action.type) {
      case 'payment_reminder':
        result = await executePaymentReminder(action)
        break
      case 'lead_response':
        result = await executeLeadResponse(action)
        break
      case 'review_reply':
        result = await executeReviewReply(action)
        break
      case 'alert':
        result = await executeAlert(action)
        break
      default:
        result = {
          success: false,
          message: `Unknown action type: ${action.type}`,
          timestamp: new Date().toISOString()
        }
    }
  } catch (error) {
    result = {
      success: false,
      message: error instanceof Error ? error.message : 'Execution failed',
      timestamp: new Date().toISOString()
    }
  }

  // Update action with result
  await updateActionStatus(actionId, result.success ? 'executed' : 'approved', result)

  return result
}

async function executePaymentReminder(action: CoFounderAction): Promise<ExecutionResult> {
  const { contact_phone, suggested_message } = action.details

  if (!contact_phone || !suggested_message) {
    return {
      success: false,
      message: 'Missing phone number or message content',
      timestamp: new Date().toISOString()
    }
  }

  // Call internal API to send SMS (uses existing Twilio integration)
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: contact_phone,
        message: suggested_message,
        businessId: action.business_id,
        actionId: action.id
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'SMS send failed')
    }

    const data = await response.json()

    return {
      success: true,
      message: `Payment reminder sent to ${contact_phone}`,
      timestamp: new Date().toISOString(),
      external_id: data.messageSid
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send SMS',
      timestamp: new Date().toISOString()
    }
  }
}

async function executeLeadResponse(action: CoFounderAction): Promise<ExecutionResult> {
  const { contact_phone, suggested_response } = action.details

  if (!contact_phone || !suggested_response) {
    return {
      success: false,
      message: 'Missing phone number or response content',
      timestamp: new Date().toISOString()
    }
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: contact_phone,
        message: suggested_response,
        businessId: action.business_id,
        actionId: action.id
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'SMS send failed')
    }

    const data = await response.json()

    return {
      success: true,
      message: `Lead response sent to ${contact_phone}`,
      timestamp: new Date().toISOString(),
      external_id: data.messageSid
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send SMS',
      timestamp: new Date().toISOString()
    }
  }
}

async function executeReviewReply(action: CoFounderAction): Promise<ExecutionResult> {
  const { review_id, review_platform, suggested_reply } = action.details

  if (!suggested_reply) {
    return {
      success: false,
      message: 'Missing reply content',
      timestamp: new Date().toISOString()
    }
  }

  // For now, mark as logged for manual posting
  // In production, this would integrate with Google Business API, Yelp API, etc.
  const db = getSupabase()

  // Update the review as replied
  if (review_id) {
    await db
      .from('reviews')
      .update({
        replied: true,
        reply_text: suggested_reply,
        replied_at: new Date().toISOString()
      })
      .eq('id', review_id)
  }

  return {
    success: true,
    message: `Review reply prepared for ${review_platform}. Please post manually if not auto-integrated.`,
    timestamp: new Date().toISOString()
  }
}

async function executeAlert(action: CoFounderAction): Promise<ExecutionResult> {
  // Alerts are informational - mark as acknowledged
  return {
    success: true,
    message: 'Alert acknowledged',
    timestamp: new Date().toISOString()
  }
}

// ============ BATCH OPERATIONS ============

export async function scanForPendingPaymentReminders(businessId: string): Promise<CoFounderAction[]> {
  const db = getSupabase()

  // Find overdue invoices without recent reminders
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: overdueInvoices, error } = await db
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .in('status', ['sent', 'overdue'])
    .lt('sent_at', sevenDaysAgo)
    .order('sent_at', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error scanning invoices:', error)
    return []
  }

  // Check for existing pending actions for these invoices
  const invoiceIds = overdueInvoices?.map(i => i.id) || []

  const { data: existingActions } = await db
    .from('cofounder_actions')
    .select('details')
    .eq('business_id', businessId)
    .eq('type', 'payment_reminder')
    .eq('status', 'pending')

  const existingInvoiceIds = new Set(
    existingActions?.map(a => a.details?.invoice_id).filter(Boolean) || []
  )

  // Generate actions for invoices without pending reminders
  const newActions: CoFounderAction[] = []

  for (const invoice of overdueInvoices || []) {
    if (!existingInvoiceIds.has(invoice.id)) {
      const action = await generatePaymentReminder(invoice)
      newActions.push(action)
    }
  }

  return newActions
}

export async function getActionStats(businessId: string): Promise<{
  pending: number
  approved: number
  executed: number
  rejected: number
  byType: Record<ActionType, number>
}> {
  const db = getSupabase()

  const { data, error } = await db
    .from('cofounder_actions')
    .select('status, type')
    .eq('business_id', businessId)

  if (error) {
    console.error('Error fetching action stats:', error)
    return {
      pending: 0,
      approved: 0,
      executed: 0,
      rejected: 0,
      byType: {} as Record<ActionType, number>
    }
  }

  const stats = {
    pending: 0,
    approved: 0,
    executed: 0,
    rejected: 0,
    byType: {} as Record<ActionType, number>
  }

  for (const action of data || []) {
    stats[action.status as keyof typeof stats]++
    stats.byType[action.type as ActionType] = (stats.byType[action.type as ActionType] || 0) + 1
  }

  return stats
}
