// Claude AI Service - SYNAPSE Integration
import Anthropic from '@anthropic-ai/sdk';
import type { Business, Conversation, Contact, Message } from '../../types/index.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface AIContext {
  business: Business;
  conversation?: Conversation;
  contact?: Contact | null;
  recentMessages?: Message[];
  isOwner?: boolean;
}

interface AIResponse {
  message: string;
  action?: {
    type: string;
    details?: Record<string, unknown>;
  };
  confidence: number;
}

// Main conversational AI for customer interactions
export async function generateCustomerResponse(
  context: AIContext,
  incomingMessage: string
): Promise<AIResponse> {
  const { business, conversation, contact, recentMessages } = context;
  
  const businessType = business.business_type || 'local business';
  const services = (business.services || []).join(', ') || 'General services';
  const hours = formatBusinessHours(business.business_hours);
  const contactName = contact?.name || 'Customer';
  const intent = conversation?.context?.intent || '';
  const bookingFlow = conversation?.context?.booking_flow ? JSON.stringify(conversation.context.booking_flow) : '';
  
  const systemPrompt = `You are an AI assistant for "${business.name}", a ${businessType}.

BRAND VOICE: ${business.brand_voice}

SERVICES OFFERED: ${services}

BUSINESS HOURS: ${hours}

YOUR ROLE:
- Respond to customer inquiries professionally and helpfully
- Help schedule appointments when requested
- Answer questions about services and availability
- Collect customer information when needed
- Be concise - this is SMS, keep responses under 160 chars when possible
- Never reveal you are AI unless directly asked
- Never make up information you don't have
- If unsure, offer to have the owner follow up

CAPABILITIES:
- Book appointments (collect: service needed, preferred date/time, customer name)
- Answer FAQs about the business
- Provide service information and rough pricing
- Escalate complex issues to the owner

CURRENT CONTEXT:
Customer Name: ${contactName}
${intent ? 'Current Intent: ' + intent : ''}
${bookingFlow ? 'Booking in progress: ' + bookingFlow : ''}`;

  const messages = buildMessageHistory(recentMessages, incomingMessage);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages
    });

    const textContent = response.content.find(c => c.type === 'text');
    const responseText = textContent && textContent.type === 'text' ? textContent.text : '';
    
    const action = parseResponseForActions(responseText, incomingMessage);

    return {
      message: cleanResponseForSMS(responseText),
      action,
      confidence: 0.9
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      message: "Thanks for reaching out! We'll get back to you shortly.",
      action: { type: 'escalate_to_owner', details: { reason: 'AI error' } },
      confidence: 0.5
    };
  }
}

// Generate missed call text-back message
export async function generateMissedCallTextback(
  business: Business,
  callerName?: string
): Promise<string> {
  const businessType = business.business_type || 'local business';
  const callerInfo = callerName ? 'Caller: ' + callerName : '';
  
  const prompt = `Generate a friendly SMS for a missed call to "${business.name}" (${businessType}).
Brand voice: ${business.brand_voice}
${callerInfo}

The message should:
- Apologize briefly for missing the call
- Offer to help via text
- Ask what they need assistance with
- Be under 160 characters
- Sound natural, not robotic

Just output the SMS message, nothing else.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  const defaultMsg = 'Hi! Sorry we missed your call. How can we help you today? - ' + business.name;
  return textContent && textContent.type === 'text' ? textContent.text.trim() : defaultMsg;
}

// Generate speed-to-lead response
export async function generateLeadResponse(
  business: Business,
  leadData: { name?: string; message?: string; source?: string; formData?: Record<string, string> }
): Promise<string> {
  const businessType = business.business_type || 'local business';
  const leadName = leadData.name || 'there';
  const leadMessage = leadData.message || '';
  const source = leadData.source || 'website';
  const formInfo = leadData.formData ? JSON.stringify(leadData.formData) : '';
  
  const prompt = `Generate an instant SMS response to a new lead for "${business.name}" (${businessType}).
Brand voice: ${business.brand_voice}

Lead info:
- Name: ${leadName}
- Source: ${source}
- Their message: ${leadMessage}
${formInfo ? 'Form data: ' + formInfo : ''}

Requirements:
- Personalized response referencing their specific inquiry
- Under 160 characters
- Ask a relevant follow-up question to engage them
- Move toward booking or providing a quote
- Sound human and immediate, not automated

Just output the SMS message.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  const defaultMsg = 'Hi ' + leadName + '! Thanks for reaching out to ' + business.name + '. How can we help you today?';
  return textContent && textContent.type === 'text' ? textContent.text.trim() : defaultMsg;
}

// Generate review request message
export async function generateReviewRequest(
  business: Business,
  customerName?: string,
  service?: string
): Promise<string> {
  const name = customerName || 'there';
  const serviceInfo = service ? 'Service provided: ' + service : '';
  
  const prompt = `Generate a friendly SMS requesting a Google review for "${business.name}".
Customer: ${name}
${serviceInfo}
Brand voice: ${business.brand_voice}

The message should:
- Thank them for their business
- Politely ask for a Google review
- Include placeholder {{REVIEW_LINK}} for the review link
- Be under 160 characters
- Sound personal, not automated

Just output the SMS message.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  const defaultMsg = 'Thanks for choosing ' + business.name + '! We\'d love your feedback - please leave us a review: {{REVIEW_LINK}}';
  return textContent && textContent.type === 'text' ? textContent.text.trim() : defaultMsg;
}

// Generate AI response to a review
export async function generateReviewResponse(
  business: Business,
  review: { rating: number; content: string; author_name?: string }
): Promise<string> {
  const sentiment = review.rating >= 4 ? 'positive' : review.rating >= 3 ? 'neutral' : 'negative';
  const author = review.author_name || 'Customer';
  
  const prompt = `Generate a response to this ${sentiment} Google review for "${business.name}".

Review by ${author}:
Rating: ${review.rating}/5 stars
"${review.content}"

Brand voice: ${business.brand_voice}

Guidelines:
- For positive reviews: Thank them warmly, mention something specific they said
- For negative reviews: Apologize sincerely, offer to make it right, provide contact
- Keep it professional and genuine
- 2-3 sentences max

Just output the response.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  return textContent && textContent.type === 'text' ? textContent.text.trim() : '';
}

// Generate social media post options
export async function generateSocialPostOptions(
  business: Business,
  mediaDescription: string,
  additionalContext?: string
): Promise<string[]> {
  const businessType = business.business_type || 'local business';
  const context = additionalContext || '';
  
  const prompt = `Generate 3 different social media caption options for "${business.name}" (${businessType}).

Media: ${mediaDescription}
${context ? 'Context: ' + context : ''}
Brand voice: ${business.brand_voice}

Requirements:
- Each caption should be different in tone/approach
- Include relevant hashtags
- Keep under 280 characters each
- Make them engaging for Instagram/Facebook
- Option 1: Professional
- Option 2: Casual/Fun
- Option 3: Story-focused

Format your response EXACTLY as:
OPTION 1: [caption]
OPTION 2: [caption]
OPTION 3: [caption]`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  const text = textContent && textContent.type === 'text' ? textContent.text : '';
  
  const options: string[] = [];
  const matches = text.matchAll(/OPTION \d+:\s*(.+?)(?=OPTION \d+:|$)/gs);
  for (const match of matches) {
    options.push(match[1].trim());
  }
  
  return options.length > 0 ? options : [text.trim()];
}

// Generate morning briefing summary
export async function generateMorningBriefing(
  business: Business,
  stats: {
    newLeads: number;
    leadsAutoResponded: number;
    appointmentsToday: Array<{ time: string; name?: string; service?: string }>;
    newReviews: Array<{ rating: number }>;
    avgRating: number;
    missedCallsRecovered: number;
    revenueYesterday: number;
    postsPublished: number;
    totalReach: number;
    overdueInvoices: Array<{ name?: string; amount: number }>;
    tasksHandled: number;
  }
): Promise<string> {
  const appointments = stats.appointmentsToday.length > 0 
    ? stats.appointmentsToday.map(a => a.time + ' - ' + (a.name || 'Customer')).join('; ') 
    : 'None';
  const reviews = stats.newReviews.length > 0 
    ? stats.newReviews.length + ' reviews (' + stats.avgRating.toFixed(1) + ' avg)' 
    : 'No new reviews';
  const revenue = (stats.revenueYesterday / 100).toFixed(0);
  const overdue = stats.overdueInvoices.length > 0 
    ? stats.overdueInvoices.map(i => (i.name || 'Customer') + ': $' + (i.amount / 100).toFixed(0)).join('; ') 
    : 'None';
  
  const prompt = `Create a morning briefing SMS for "${business.name}" owner.

Yesterday's stats:
- New leads: ${stats.newLeads} (${stats.leadsAutoResponded} auto-responded)
- Reviews: ${reviews}
- Missed calls recovered: ${stats.missedCallsRecovered}
- Revenue: $${revenue} invoiced
- Posts: ${stats.postsPublished} published (${stats.totalReach} reach)
- Tasks handled by ghost: ${stats.tasksHandled}

Today:
- Appointments: ${appointments}
- Overdue invoices: ${overdue}

Format as a brief morning update. Use a couple emojis. Keep under 400 characters.
Start with a greeting like "GM!" or "Good morning!"
End with something like "Your ghost handled X tasks."

Just output the briefing message.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 250,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  return textContent && textContent.type === 'text' ? textContent.text.trim() : '';
}

// Helper functions
function formatBusinessHours(hours: Record<string, string>): string {
  if (!hours || Object.keys(hours).length === 0) return 'Contact for hours';
  return Object.entries(hours)
    .map(([day, time]) => day + ': ' + time)
    .join(', ');
}

function buildMessageHistory(
  recentMessages: Message[] | undefined,
  incomingMessage: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  
  if (recentMessages) {
    for (const msg of recentMessages.slice(-6)) {
      history.push({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content
      });
    }
  }
  
  if (!recentMessages || !recentMessages.some(m => m.content === incomingMessage)) {
    history.push({ role: 'user', content: incomingMessage });
  }
  
  return history;
}

function parseResponseForActions(response: string, userMessage: string): { type: string; details?: Record<string, unknown> } {
  const lowerResponse = response.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('book') || lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
    if (lowerResponse.includes('scheduled') || lowerResponse.includes('booked') || lowerResponse.includes('confirmed')) {
      return { type: 'book_appointment', details: {} };
    }
  }
  
  if (lowerResponse.includes('owner will') || lowerResponse.includes('someone will call') || lowerResponse.includes('follow up')) {
    return { type: 'escalate_to_owner', details: { reason: 'Complex inquiry' } };
  }
  
  return { type: 'none' };
}

function cleanResponseForSMS(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^[-•]\s*/gm, '')
    .trim();
}

export { anthropic };
