// ===========================================
// CLAUDE AI SERVICE
// SYNAPSE Agent: AI Integration
// ===========================================

import Anthropic from '@anthropic-ai/sdk';
import type { Business, Message, OwnerCommand, SocialPlatform } from '../types/index.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

// ===========================================
// SYSTEM PROMPTS
// ===========================================

function getBusinessAgentPrompt(business: Business): string {
  return `You are the AI assistant for ${business.name}, a ${business.industry} business owned by ${business.owner_name}.

Your communication style: ${business.brand_voice}

CRITICAL RULES:
1. You represent the business directly. Never say "I'm an AI" or reveal you're automated.
2. Be warm, professional, and helpful.
3. Keep responses concise - this is SMS, not email.
4. When booking appointments, confirm the date/time clearly.
5. If asked about pricing or complex questions, offer to have ${business.owner_name} call them back.
6. Always aim to convert conversations into booked appointments.
7. Use natural language, not formal or robotic text.

CURRENT TIME: ${new Date().toLocaleString('en-US', { timeZone: business.timezone })}
TIMEZONE: ${business.timezone}`;
}

// ===========================================
// CONVERSATION AI
// ===========================================

export async function generateResponse(
  business: Business,
  conversationHistory: Message[],
  latestMessage: string,
  context?: {
    type?: string;
    leadInfo?: { name?: string; source?: string };
    appointmentSlots?: string[];
  }
): Promise<string> {
  const systemPrompt = getBusinessAgentPrompt(business);

  let contextInfo = '';
  if (context?.type === 'missed_call') {
    contextInfo = `\n\nCONTEXT: This person just called but the call was missed. Your goal is to apologize for missing the call and offer to help via text or schedule a callback.`;
  } else if (context?.type === 'lead') {
    contextInfo = `\n\nCONTEXT: This is a new lead. Be enthusiastic but not pushy. Try to qualify them and book an appointment.`;
  }

  if (context?.appointmentSlots?.length) {
    contextInfo += `\n\nAVAILABLE APPOINTMENT SLOTS:\n${context.appointmentSlots.join('\n')}`;
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = conversationHistory.map((msg) => ({
    role: msg.direction === 'inbound' ? 'user' as const : 'assistant' as const,
    content: msg.content,
  }));

  messages.push({ role: 'user' as const, content: latestMessage });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: systemPrompt + contextInfo,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : 'Thanks for reaching out! Let me get back to you shortly.';
}

// ===========================================
// OWNER COMMAND PARSING
// ===========================================

export async function parseOwnerCommand(
  message: string
): Promise<OwnerCommand | null> {
  const lowerMessage = message.toLowerCase().trim();

  // Quick pattern matching for common commands
  if (lowerMessage === 'pause' || lowerMessage === 'stop') {
    return { type: 'pause' };
  }
  if (lowerMessage === 'resume' || lowerMessage === 'start') {
    return { type: 'resume' };
  }
  if (lowerMessage === 'status') {
    return { type: 'status' };
  }
  if (lowerMessage === 'unpaid' || lowerMessage === 'overdue') {
    return { type: 'unpaid' };
  }
  if (lowerMessage === 'help' || lowerMessage === '?') {
    return { type: 'help' };
  }

  // Invoice command: "invoice John 500 plumbing repair"
  const invoiceMatch = message.match(
    /invoice\s+(\w+)\s+(\d+(?:\.\d{2})?)\s+(.+)/i
  );
  if (invoiceMatch) {
    return {
      type: 'invoice',
      customer: invoiceMatch[1],
      amount: parseFloat(invoiceMatch[2]),
      description: invoiceMatch[3],
    };
  }

  // Post command (triggers social media flow)
  if (lowerMessage === 'post' || lowerMessage.startsWith('post ')) {
    const platforms: SocialPlatform[] = [];
    if (lowerMessage.includes('ig') || lowerMessage.includes('instagram')) {
      platforms.push('instagram');
    }
    if (lowerMessage.includes('fb') || lowerMessage.includes('facebook')) {
      platforms.push('facebook');
    }
    return { type: 'post', platforms: platforms.length ? platforms : undefined };
  }

  // Schedule command: "schedule <postId> tomorrow 3pm"
  const scheduleMatch = message.match(
    /schedule\s+([a-f0-9-]+)\s+(.+)/i
  );
  if (scheduleMatch) {
    return {
      type: 'schedule',
      post_id: scheduleMatch[1],
      datetime: scheduleMatch[2],
    };
  }

  // Use AI to try to parse complex commands
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: `You parse owner commands for a business SMS system.
Return ONLY a JSON object matching one of these types:
- {"type": "pause"}
- {"type": "resume"}
- {"type": "status"}
- {"type": "invoice", "customer": "name", "amount": 123.45, "description": "service"}
- {"type": "post"}
- {"type": "unpaid"}
- {"type": "help"}
- null (if not a command)

Be flexible with natural language. "bill john $500 for plumbing" = invoice command.`,
    messages: [{ role: 'user', content: message }],
  });

  try {
    const textBlock = response.content.find((block) => block.type === 'text');
    const text = textBlock?.type === 'text' ? textBlock.text : '';
    const parsed = JSON.parse(text);
    return parsed as OwnerCommand | null;
  } catch {
    return null;
  }
}

// ===========================================
// SOCIAL MEDIA CAPTIONS
// ===========================================

export async function generateCaptions(
  business: Business,
  mediaDescription: string,
  platforms: SocialPlatform[]
): Promise<string[]> {
  const platformInfo = platforms.includes('instagram')
    ? 'Instagram (use relevant hashtags, engaging tone)'
    : 'Facebook (conversational, community-focused)';

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: `You write social media captions for ${business.name}, a ${business.industry} business.
Brand voice: ${business.brand_voice}

Generate 3 caption options for ${platformInfo}.
Each caption should:
- Be engaging and authentic
- Match the brand voice
- Include a call to action
- Be appropriate length for the platform

Return ONLY a JSON array of 3 strings.`,
    messages: [
      {
        role: 'user',
        content: `Create 3 caption options for this content: ${mediaDescription}`,
      },
    ],
  });

  try {
    const textBlock = response.content.find((block) => block.type === 'text');
    const text = textBlock?.type === 'text' ? textBlock.text : '[]';
    return JSON.parse(text) as string[];
  } catch {
    return [
      `Check out our latest work! #${business.industry.replace(/\s+/g, '')}`,
      `Another day, another satisfied customer! 💪`,
      `We love what we do. Contact us for your next project!`,
    ];
  }
}

// ===========================================
// REVIEW RESPONSES
// ===========================================

export async function generateReviewResponse(
  business: Business,
  reviewerName: string,
  rating: number,
  reviewContent: string
): Promise<string> {
  const tone =
    rating >= 4
      ? 'grateful and enthusiastic'
      : rating >= 3
        ? 'appreciative and constructive'
        : 'apologetic, empathetic, and solution-oriented';

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: `You write review responses for ${business.name}, owned by ${business.owner_name}.
Brand voice: ${business.brand_voice}

Write a ${tone} response to this review.
- Thank them by name
- Be genuine and personal
- For negative reviews: apologize, show you care, offer to make it right
- Keep it concise but warm
- Sign off with ${business.owner_name}'s first name`,
    messages: [
      {
        role: 'user',
        content: `${rating}-star review from ${reviewerName}: "${reviewContent}"`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : `Thank you for your feedback, ${reviewerName}!`;
}

// ===========================================
// MORNING BRIEFING
// ===========================================

export async function generateBriefingMessage(
  business: Business,
  metrics: {
    newLeads: number;
    newReviews: number;
    avgRating: number;
    revenueToday: number;
    revenueWeek: number;
    unpaidInvoices: number;
    unpaidAmount: number;
    appointmentsToday: number;
  }
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: `You create concise morning briefing SMS messages for business owners.
Keep it under 300 characters. Use simple formatting. Be encouraging but factual.
Owner name: ${business.owner_name}`,
    messages: [
      {
        role: 'user',
        content: `Create a morning briefing with these metrics:
- New leads: ${metrics.newLeads}
- Today's appointments: ${metrics.appointmentsToday}
- New reviews: ${metrics.newReviews} (avg ${metrics.avgRating}⭐)
- Revenue today: $${metrics.revenueToday}
- Revenue this week: $${metrics.revenueWeek}
- Unpaid invoices: ${metrics.unpaidInvoices} ($${metrics.unpaidAmount})`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : `Good morning! ${metrics.newLeads} new leads, ${metrics.appointmentsToday} appointments today, $${metrics.revenueWeek} revenue this week.`;
}

// ===========================================
// APPOINTMENT EXTRACTION
// ===========================================

export async function extractAppointmentDetails(
  conversationHistory: Message[]
): Promise<{
  confirmed: boolean;
  datetime?: string;
  customerName?: string;
} | null> {
  const transcript = conversationHistory
    .map((m) => `${m.direction === 'inbound' ? 'Customer' : 'Business'}: ${m.content}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 150,
    system: `Analyze this SMS conversation and extract appointment details.
Return JSON: {"confirmed": boolean, "datetime": "ISO string or null", "customerName": "string or null"}
Only return confirmed:true if there's a clear agreement on date/time.`,
    messages: [{ role: 'user', content: transcript }],
  });

  try {
    const textBlock = response.content.find((block) => block.type === 'text');
    const text = textBlock?.type === 'text' ? textBlock.text : '';
    return JSON.parse(text);
  } catch {
    return null;
  }
}
