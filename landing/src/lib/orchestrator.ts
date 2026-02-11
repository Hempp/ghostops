import Anthropic from '@anthropic-ai/sdk'
import {
  getRecentMessages,
  getMonthlyStats,
  getMonthlyInvoices,
} from './supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface OrchestrateInput {
  businessId: string
  business: Record<string, unknown>
  conversationId: string | null
  message: string
  mediaUrls: string[]
  isOwner: boolean
  phone: string
}

interface OrchestrateResult {
  reply: string | null
  intent: string
  actions?: unknown[]
}

type Intent =
  | 'calendar_query'
  | 'calendar_add'
  | 'email_query'
  | 'email_send'
  | 'invoice_create'
  | 'invoice_query'
  | 'social_post'
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
    return handleMissedCall(business)
  }

  // Check if business needs onboarding
  if (!business.onboarding_complete && isOwner) {
    return handleOnboarding(business, message)
  }

  // Get conversation history for context
  const history = conversationId ? await getRecentMessages(conversationId) : []

  // Detect intent
  const intent = await detectIntent(message, mediaUrls, isOwner)

  // Route to appropriate handler
  switch (intent) {
    case 'stats_query':
      return handleStatsQuery(businessId)

    case 'help':
      return {
        reply: getHelpMessage(isOwner),
        intent: 'help',
      }

    case 'invoice_create':
      return handleInvoiceCreate(business, message)

    case 'review_request':
      return handleReviewRequest(message)

    default:
      return handleGeneralChat(business, message, history, isOwner)
  }
}

async function detectIntent(
  message: string,
  mediaUrls: string[],
  isOwner: boolean
): Promise<Intent> {
  const hasMedia = mediaUrls.length > 0
  const lowerMessage = message.toLowerCase()

  // Quick pattern matching for common intents
  if (/^(what('?s| is) my day|schedule|calendar|appointments?)/.test(lowerMessage)) {
    return 'calendar_query'
  }
  if (/^(add|schedule|book|create).*(appointment|meeting|event)/.test(lowerMessage)) {
    return 'calendar_add'
  }
  if (/^(invoice|bill|charge|send.*\$)/.test(lowerMessage) || /\$\d+/.test(message)) {
    return 'invoice_create'
  }
  if (/^(unpaid|invoices?|payments?|outstanding)/.test(lowerMessage)) {
    return 'invoice_query'
  }
  if (/^(email|mail|sent me|inbox)/.test(lowerMessage)) {
    return 'email_query'
  }
  if (hasMedia || /^(post|instagram|facebook|social)/.test(lowerMessage)) {
    return 'social_post'
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

  return 'general_chat'
}

async function handleMissedCall(business: Record<string, unknown>): Promise<OrchestrateResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: `You are a friendly AI assistant for ${business.name || 'this business'}.
Someone just called but couldn't reach us. Write a short, friendly text message to:
1. Apologize for missing their call
2. Ask how you can help
3. Mention you can answer questions or help book an appointment

Keep it under 160 characters. Be warm and professional.`,
    messages: [{ role: 'user', content: 'Generate a missed call text-back message' }],
  })

  const textContent = response.content[0]
  const reply = textContent.type === 'text' ? textContent.text : null

  return {
    reply,
    intent: 'missed_call_recovery',
  }
}

async function handleOnboarding(
  business: Record<string, unknown>,
  message: string
): Promise<OrchestrateResult> {
  const step = business.onboarding_step || 'welcome'

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: `You are helping onboard a new business owner to GhostOps.
Current step: ${step}
Business name: ${business.name || 'not set'}

Guide them through setup:
1. Get business name
2. Get business type/services
3. Set their brand voice preference

Be conversational and helpful. Keep responses short (SMS format).`,
    messages: [{ role: 'user', content: message }],
  })

  const textContent = response.content[0]
  const reply = textContent.type === 'text' ? textContent.text : null

  return {
    reply,
    intent: 'onboarding',
  }
}

async function handleStatsQuery(businessId: string): Promise<OrchestrateResult> {
  const [stats, invoices] = await Promise.all([
    getMonthlyStats(businessId),
    getMonthlyInvoices(businessId),
  ])

  const monthName = new Date().toLocaleDateString('en', { month: 'long' })

  return {
    reply:
      `${monthName} stats:\n` +
      `Revenue: $${(invoices.totalRevenue / 100).toLocaleString()}\n` +
      `Unpaid: ${invoices.unpaidCount} invoices ($${(invoices.unpaidTotal / 100).toLocaleString()})\n` +
      `Messages: ${stats.messages}\n` +
      `Missed calls recovered: ${stats.missedCalls}\n` +
      `New leads: ${stats.newLeads}`,
    intent: 'stats_query',
  }
}

async function handleInvoiceCreate(
  business: Record<string, unknown>,
  message: string
): Promise<OrchestrateResult> {
  // Extract invoice details using Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    system: `Extract invoice details from this message.
Respond as JSON: {"name": "customer name", "amount": number_in_cents, "description": "service description"}
If any field is missing, use null.`,
    messages: [{ role: 'user', content: message }],
  })

  try {
    const textContent = response.content[0]
    const text = textContent.type === 'text' ? textContent.text : '{}'
    const details = JSON.parse(text)

    if (!details.name || !details.amount) {
      return {
        reply: "I need a name and amount to create an invoice. Try: 'invoice John $500 for consulting'",
        intent: 'invoice_create',
      }
    }

    // TODO: Actually create invoice via Stripe
    return {
      reply: `Got it! Creating invoice for ${details.name}: $${(details.amount / 100).toFixed(2)} for ${details.description || 'services'}. I'll send the payment link.`,
      intent: 'invoice_create',
    }
  } catch {
    return {
      reply: "I need a name and amount. Try: 'invoice John $500 for consulting'",
      intent: 'invoice_create',
    }
  }
}

async function handleReviewRequest(message: string): Promise<OrchestrateResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    system: `Extract customer name and/or phone number from this message.
Respond as JSON: {"name": "...", "phone": "..."} or {"error": "not found"} if not found.`,
    messages: [{ role: 'user', content: message }],
  })

  try {
    const textContent = response.content[0]
    const text = textContent.type === 'text' ? textContent.text : '{}'
    const extracted = JSON.parse(text)

    if (extracted.error) {
      return {
        reply: "Who should I send the review request to? Give me a name or phone number.",
        intent: 'review_request',
      }
    }

    return {
      reply: `Got it! I'll send a review request to ${extracted.name || extracted.phone}.`,
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
  business: Record<string, unknown>,
  message: string,
  history: Array<{ direction: string; content: string }>,
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

  const textContent = response.content[0]
  const reply = textContent.type === 'text' ? textContent.text : null

  return {
    reply,
    intent: 'general_chat',
  }
}

function getHelpMessage(isOwner: boolean): string {
  if (isOwner) {
    return `Here's what I can do:

Calendar: "what's my day" / "add meeting Monday 2pm"
Email: "what did [name] email me"
Invoice: "invoice [name] $500 for [service]"
Social: Send a photo + "post to instagram"
Stats: "how much did I make this month"
Reviews: "ask [name] for a review"

Just text me like you'd text an assistant!`
  }

  return `Hi! I'm the AI assistant here. I can help you:
- Answer questions about our services
- Book an appointment
- Get you to the right person

How can I help?`
}
