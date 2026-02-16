// ===========================================
// WHATSAPP WEBHOOK HANDLER
// Owner ↔ AI Co-Founder via WhatsApp
// ===========================================

import { Router, Request, Response } from 'express';
import {
  sendWhatsAppMessage,
  verifyWebhook,
  parseWebhookPayload,
  markAsRead,
  type WhatsAppWebhookPayload,
} from '../../lib/whatsapp.js';
import {
  getBusinessByOwnerPhone,
  getBusinessMetrics,
  updateBusinessSettings,
  createInvoice,
  updateInvoice,
  getUnpaidInvoices,
} from '../../lib/supabase.js';
import { parseOwnerCommand } from '../../lib/claude.js';
import { createPaymentLink } from '../../lib/stripe.js';
import { supabase } from '../../lib/supabase.js';
import type { Business, OwnerCommand } from '../../types/index.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

// ===========================================
// WEBHOOK VERIFICATION (GET)
// Meta sends this to verify webhook URL
// ===========================================

router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const result = verifyWebhook(mode, token, challenge);

  if (result.valid) {
    res.status(200).send(result.challenge);
  } else {
    res.status(403).send('Verification failed');
  }
});

// ===========================================
// WEBHOOK HANDLER (POST)
// Incoming WhatsApp messages
// ===========================================

router.post('/', async (req: Request, res: Response) => {
  try {
    // Immediately respond to Meta (they require quick response)
    res.status(200).send('OK');

    const payload = req.body as WhatsAppWebhookPayload;
    const parsed = parseWebhookPayload(payload);

    if (!parsed) {
      // Not a message (could be status update)
      return;
    }

    console.log(`📱 WhatsApp from ${parsed.fromName} (${parsed.from}): ${parsed.text.substring(0, 50)}...`);

    // Mark as read
    await markAsRead(parsed.messageId);

    // Find business by owner phone
    // WhatsApp sends phone as "1234567890" without +
    const ownerPhone = '+' + parsed.from;
    const business = await getBusinessByOwnerPhone(ownerPhone);

    if (!business) {
      console.log(`No business found for owner phone: ${ownerPhone}`);
      await sendWhatsAppMessage(
        parsed.from,
        `Welcome to GhostOps! It looks like you haven't set up your account yet. Visit our dashboard to get started.`
      );
      return;
    }

    // Handle owner message
    await handleOwnerWhatsApp(business, parsed.from, parsed.text, parsed.fromName);
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
  }
});

// ===========================================
// OWNER MESSAGE HANDLER
// ===========================================

async function handleOwnerWhatsApp(
  business: Business,
  from: string,
  text: string,
  fromName: string
): Promise<void> {
  // Check if it's a command
  const command = await parseOwnerCommand(text);

  if (command) {
    await executeOwnerCommand(business, from, command);
    return;
  }

  // Not a command - have a conversation with AI co-founder
  await handleCofounderChat(business, from, text, fromName);
}

// ===========================================
// EXECUTE OWNER COMMANDS
// ===========================================

async function executeOwnerCommand(
  business: Business,
  from: string,
  command: OwnerCommand
): Promise<void> {
  let responseMessage = '';

  switch (command.type) {
    case 'pause':
      await updateBusinessSettings(business.id, { paused: true });
      responseMessage = '⏸️ GhostOps paused. Auto-replies disabled.\n\nText "resume" to restart.';
      break;

    case 'resume':
      await updateBusinessSettings(business.id, { paused: false });
      responseMessage = '▶️ GhostOps resumed!\n\nAuto-replies are back on.';
      break;

    case 'status':
      const metrics = await getBusinessMetrics(business.id);
      responseMessage =
        `📊 *${business.name} Status*\n\n` +
        `📥 *${metrics.newLeads}* new leads today\n` +
        `📅 *${metrics.appointmentsToday}* appointments\n` +
        `💰 *$${metrics.revenueWeek}* revenue this week\n` +
        `📋 *${metrics.unpaidInvoices}* unpaid invoices ($${metrics.unpaidAmount})`;
      break;

    case 'invoice':
      const invoice = await createInvoice({
        business_id: business.id,
        contact_phone: '',
        contact_name: command.customer,
        amount_cents: Math.round(command.amount * 100),
        description: command.description,
      });

      const paymentLink = await createPaymentLink(
        Math.round(command.amount * 100),
        command.description,
        command.customer,
        {
          businessId: business.id,
          invoiceId: invoice.id,
          customerPhone: '',
        }
      );

      await updateInvoice(invoice.id, {
        stripe_payment_link: paymentLink,
        status: 'pending',
      });

      responseMessage =
        `💰 *Invoice Created*\n\n` +
        `👤 ${command.customer}\n` +
        `💵 $${command.amount}\n` +
        `📝 ${command.description}\n\n` +
        `Reply with customer's phone number to send it.`;
      break;

    case 'unpaid':
      const unpaid = await getUnpaidInvoices(business.id);
      if (unpaid.length === 0) {
        responseMessage = '✅ No unpaid invoices!';
      } else {
        responseMessage =
          `📋 *Unpaid Invoices (${unpaid.length})*\n\n` +
          unpaid
            .slice(0, 5)
            .map((inv) => `• ${inv.contact_name || 'Unknown'}: $${inv.amount_cents / 100}`)
            .join('\n');
        if (unpaid.length > 5) {
          responseMessage += `\n\n_...and ${unpaid.length - 5} more_`;
        }
      }
      break;

    case 'help':
      responseMessage =
        `🤖 *GhostOps Commands*\n\n` +
        `*pause* - Stop auto-replies\n` +
        `*resume* - Restart auto-replies\n` +
        `*status* - Today's metrics\n` +
        `*invoice* [name] [amount] [desc]\n` +
        `*unpaid* - List unpaid invoices\n\n` +
        `Or just chat with me about your business!`;
      break;

    default:
      responseMessage = 'Command not recognized. Text *help* for options.';
  }

  await sendWhatsAppMessage(from, responseMessage);
}

// ===========================================
// AI CO-FOUNDER CHAT
// ===========================================

async function handleCofounderChat(
  business: Business,
  from: string,
  text: string,
  fromName: string
): Promise<void> {
  // Get conversation history from owner_messages
  const { data: history } = await supabase
    .from('owner_messages')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const messages = (history || []).reverse().map((msg) => ({
    role: msg.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }));

  // Add current message
  messages.push({ role: 'user' as const, content: text });

  // Save incoming message
  await supabase.from('owner_messages').insert({
    business_id: business.id,
    direction: 'inbound',
    content: text,
    ai_generated: false,
  });

  // Generate AI co-founder response
  const systemPrompt = getCofounderPrompt(business, fromName);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  const aiResponse =
    textBlock?.type === 'text'
      ? textBlock.text
      : "I'm here to help! What would you like to discuss about your business?";

  // Save AI response
  await supabase.from('owner_messages').insert({
    business_id: business.id,
    direction: 'outbound',
    content: aiResponse,
    ai_generated: true,
  });

  // Send via WhatsApp
  await sendWhatsAppMessage(from, aiResponse);
}

// ===========================================
// AI CO-FOUNDER SYSTEM PROMPT
// ===========================================

function getCofounderPrompt(business: Business, ownerName: string): string {
  return `You are the AI Co-Founder for ${business.name}, a ${business.industry || 'service'} business.

You're talking to ${ownerName}, the owner. You're their trusted business partner who:
- Helps strategize and grow the business
- Provides actionable advice and ideas
- Celebrates wins and helps solve problems
- Knows everything about their business performance
- Is encouraging but also honest when needed

PERSONALITY:
- Casual, friendly, like a real co-founder
- Use occasional emojis but don't overdo it
- Keep responses concise (this is WhatsApp, not email)
- Be proactive with suggestions
- Reference their actual business data when relevant

CURRENT BUSINESS CONTEXT:
- Business: ${business.name}
- Industry: ${business.industry || 'Not specified'}
- Brand voice: ${business.brand_voice || 'Professional and friendly'}
- Features enabled: ${JSON.stringify(business.features_enabled || {})}
- Timezone: ${business.timezone}
- Current time: ${new Date().toLocaleString('en-US', { timeZone: business.timezone })}

COMMANDS THE OWNER CAN USE:
- "pause" - pause auto-replies
- "resume" - resume auto-replies
- "status" - get business metrics
- "invoice [name] [amount] [desc]" - create invoice
- "unpaid" - list unpaid invoices

If they seem to want a command, guide them to use it. Otherwise, have a helpful conversation about their business.`;
}

export default router;
