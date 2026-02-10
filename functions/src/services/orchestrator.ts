import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import Anthropic from '@anthropic-ai/sdk'
import { handleCalendar } from './calendar'
import { handleEmail } from './email'
import { handleInvoice } from './invoice'
import { handleSocialPost } from './social'
import { handleOnboarding } from './onboarding'

const db = admin.firestore()

const anthropic = new Anthropic({
  apiKey: functions.config().anthropic?.api_key,
})

interface OrchestrateInput {
  businessId: string
  business: any
  conversationId: string | null
  message: string
  mediaUrls: string[]
  isOwner: boolean
  phone: string
}

interface OrchestrateResult {
  reply: string | null
  intent: string
  actions?: any[]
}

// Intent categories
type Intent =
  | 'calendar_query'
  | 'calendar_add'
  | 'email_query'
  | 'email_send'
  | 'invoice_create'
  | 'invoice_query'
  | 'social_post'
  | 'social_schedule'
  | 'stats_query'
  | 'missed_call_recovery'
  | 'review_request'
  | 'onboarding'
  | 'general_chat'
  | 'help'

export async function orchestrate(input: OrchestrateInput): Promise<OrchestrateResult> {
  const { businessId, business, conversationId, message, mediaUrls, isOwner, phone } = input

  // Handle special triggers
  if (message === '__MISSED_CALL__') {
    return handleMissedCall(business, phone)
  }

  // Check if business needs onboarding
  if (!business.onboarding_complete && isOwner) {
    return handleOnboarding(businessId, business, message, phone)
  }

  // Get conversation history for context
  const history = conversationId ? await getConversationHistory(conversationId) : []

  // Detect intent with Claude
  const intent = await detectIntent(message, mediaUrls, isOwner, history)

  // Route to appropriate handler
  switch (intent) {
    case 'calendar_query':
    case 'calendar_add':
      return handleCalendar(businessId, message, intent)

    case 'email_query':
    case 'email_send':
      return handleEmail(businessId, message, intent)

    case 'invoice_create':
    case 'invoice_query':
      return handleInvoice(businessId, message, intent, phone)

    case 'social_post':
    case 'social_schedule':
      return handleSocialPost(businessId, message, mediaUrls, intent)

    case 'stats_query':
      return handleStatsQuery(businessId)

    case 'review_request':
      return handleReviewRequest(businessId, message)

    case 'help':
      return {
        reply: getHelpMessage(isOwner),
        intent: 'help',
      }

    default:
      return handleGeneralChat(business, message, history, isOwner)
  }
}

async function detectIntent(
  message: string,
  mediaUrls: string[],
  isOwner: boolean,
  history: any[]
): Promise<Intent> {
  const hasMedia = mediaUrls.length > 0
  const lowerMessage = message.toLowerCase()

  // Quick pattern matching for common intents
  if (/^(what('?s| is) my day|schedule|calendar|appointments?)/.test(lowerMessage)) {
    return 'calendar_query'
  }
  if (/^(add|schedule|book|create).*(appointment|meeting|event|calendar)/.test(lowerMessage)) {
    return 'calendar_add'
  }
  if (/^(invoice|bill|charge|send.*\$)/.test(lowerMessage) || /\$\d+/.test(message)) {
    return 'invoice_create'
  }
  if (/^(unpaid|invoices?|payments?|outstanding)/.test(lowerMessage)) {
    return 'invoice_query'
  }
  if (/^(email|mail|sent me|inbox)/.test(lowerMessage) || /what did.*email/.test(lowerMessage)) {
    return 'email_query'
  }
  if (/^(email|tell|send|reply|respond).*(@|to )/.test(lowerMessage)) {
    return 'email_send'
  }
  if (hasMedia || /^(post|instagram|facebook|social)/.test(lowerMessage)) {
    return 'social_post'
  }
  if (/^(schedule|tomorrow|post at|post later)/.test(lowerMessage)) {
    return 'social_schedule'
  }
  if (/^(how much|revenue|earnings|made|stats|numbers)/.test(lowerMessage)) {
    return 'stats_query'
  }
  if (/^(review|feedback|ask.*review)/.test(lowerMessage)) {
    return 'review_request'
  }
  if (/^(help|commands|what can you)/.test(lowerMessage)) {
    return 'help'
  }

  // Use Claude for ambiguous intents
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 50,
    system: `You are an intent classifier. Classify the user message into ONE of these categories:
calendar_query, calendar_add, email_query, email_send, invoice_create, invoice_query,
social_post, social_schedule, stats_query, review_request, help, general_chat

Respond with ONLY the category name, nothing else.`,
    messages: [{ role: 'user', content: message }],
  })

  const intentText = (response.content[0] as any).text?.trim().toLowerCase() || 'general_chat'
  return intentText as Intent
}

async function handleMissedCall(business: any, phone: string): Promise<OrchestrateResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: `You are a friendly AI assistant for ${business.name || 'this business'}.
Someone just called but couldn't reach us. Write a short, friendly text message to:
1. Apologize for missing their call
2. Ask how you can help
3. Mention you can answer questions or help book an appointment

Keep it under 160 characters if possible. Be warm and professional.`,
    messages: [{ role: 'user', content: 'Generate a missed call text-back message' }],
  })

  return {
    reply: (response.content[0] as any).text,
    intent: 'missed_call_recovery',
  }
}

async function handleStatsQuery(businessId: string): Promise<OrchestrateResult> {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  // Get this month's invoices
  const invoicesSnap = await db
    .collection('invoices')
    .where('business_id', '==', businessId)
    .where('created_at', '>=', startOfMonth)
    .get()

  const invoices = invoicesSnap.docs.map((d) => d.data())
  const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.amount_cents || 0), 0)
  const unpaidTotal = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.amount_cents || 0), 0)
  const unpaidCount = invoices.filter((i) => i.status !== 'paid').length

  // Get stats
  const statsSnap = await db
    .collection('daily_stats')
    .where('business_id', '==', businessId)
    .where('date', '>=', startOfMonth.toISOString().split('T')[0])
    .get()

  const stats = statsSnap.docs.reduce(
    (acc, d) => {
      const data = d.data()
      acc.messages += (data.customer_messages || 0) + (data.owner_messages || 0)
      acc.missedCalls += data.missed_calls || 0
      acc.newLeads += data.new_leads || 0
      return acc
    },
    { messages: 0, missedCalls: 0, newLeads: 0 }
  )

  const monthName = today.toLocaleDateString('en', { month: 'long' })

  return {
    reply:
      `${monthName} stats:\n` +
      `💰 Revenue: $${(totalRevenue / 100).toLocaleString()}\n` +
      `📋 Unpaid: ${unpaidCount} invoices ($${(unpaidTotal / 100).toLocaleString()})\n` +
      `💬 Messages: ${stats.messages}\n` +
      `📞 Missed calls recovered: ${stats.missedCalls}\n` +
      `🎯 New leads: ${stats.newLeads}`,
    intent: 'stats_query',
  }
}

async function handleReviewRequest(businessId: string, message: string): Promise<OrchestrateResult> {
  // Extract customer name/phone from message
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    system: `Extract customer name and/or phone number from this message.
Respond as JSON: {"name": "...", "phone": "..."} or {"error": "..."} if not found.`,
    messages: [{ role: 'user', content: message }],
  })

  try {
    const extracted = JSON.parse((response.content[0] as any).text)
    if (extracted.error) {
      return {
        reply: "Who should I send the review request to? Give me a name or phone number.",
        intent: 'review_request',
      }
    }

    // TODO: Actually send review request SMS
    return {
      reply: `Got it! I'll send a review request to ${extracted.name || extracted.phone}. ✅`,
      intent: 'review_request',
    }
  } catch {
    return {
      reply: "Who should I send the review request to?",
      intent: 'review_request',
    }
  }
}

async function handleGeneralChat(
  business: any,
  message: string,
  history: any[],
  isOwner: boolean
): Promise<OrchestrateResult> {
  const systemPrompt = isOwner
    ? `You are a helpful AI assistant for ${business.name || 'this business'}.
The business owner is texting you. Help them with anything they need.
Be concise - this is SMS, keep responses short.`
    : `You are a friendly AI assistant for ${business.name || 'this business'}.
A customer is texting. Answer their questions, help them book appointments,
or get them to the right person. Be helpful but concise - this is SMS.
Business info: ${business.description || 'Service business'}`

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history.slice(-10).map((m) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages,
  })

  return {
    reply: (response.content[0] as any).text,
    intent: 'general_chat',
  }
}

function getHelpMessage(isOwner: boolean): string {
  if (isOwner) {
    return `Here's what I can do:

📅 Calendar: "what's my day" / "add meeting Monday 2pm"
📧 Email: "what did [name] email me" / "email [name] about..."
💰 Invoice: "invoice [name] $500 for [service]"
📱 Social: Send a photo + "post to instagram"
📊 Stats: "how much did I make this month"
⭐ Reviews: "ask [name] for a review"

Just text me like you'd text an assistant!`
  }

  return `Hi! I'm the AI assistant here. I can help you:
• Answer questions about our services
• Book an appointment
• Get you to the right person

How can I help?`
}

async function getConversationHistory(conversationId: string) {
  const messagesSnap = await db
    .collection('messages')
    .where('conversation_id', '==', conversationId)
    .orderBy('created_at', 'desc')
    .limit(20)
    .get()

  return messagesSnap.docs.map((d) => d.data()).reverse()
}
