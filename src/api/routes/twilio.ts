// ===========================================
// TWILIO WEBHOOK ROUTES
// EDGE-RUNNER Agent: SMS & Voice Handling
// ===========================================

import { Router, Request, Response } from 'express';
import {
  getBusinessByTwilioNumber,
  getBusinessByOwnerPhone,
  getOrCreateConversation,
  getConversationHistory,
  saveMessage,
  createLead,
  createInvoice,
  updateInvoice,
  getUnpaidInvoices,
  createSocialPost,
  updateSocialPost,
  updateBusinessSettings,
  getBusinessMetrics,
} from '../../lib/supabase.js';
import {
  sendSms,
  generateMissedCallResponse,
  validateTwilioSignature,
} from '../../lib/twilio.js';
import {
  generateResponse,
  parseOwnerCommand,
  generateCaptions,
  generateBriefingMessage,
} from '../../lib/claude.js';
import { createPaymentLink } from '../../lib/stripe.js';
import type {
  TwilioSmsWebhook,
  TwilioVoiceWebhook,
  Business,
  OwnerCommand,
} from '../../types/index.js';

export const twilioRouter = Router();

// ===========================================
// SMS WEBHOOK - Main Entry Point
// ===========================================

twilioRouter.post('/sms', async (req: Request, res: Response) => {
  try {
    const webhook = req.body as TwilioSmsWebhook;
    const { From: from, To: to, Body: body, NumMedia: numMedia } = webhook;

    console.log(`📱 SMS received: ${from} → ${to}: ${body.substring(0, 50)}...`);

    // Get the business for this Twilio number
    const business = await getBusinessByTwilioNumber(to);
    if (!business) {
      console.error(`No business found for Twilio number: ${to}`);
      return res.status(200).send('OK');
    }

    // Check if business is paused
    if (business.settings?.paused || business.is_paused) {
      console.log(`Business ${business.name} is paused, skipping auto-reply`);
      return res.status(200).send('OK');
    }

    // Collect media URLs
    const mediaUrls: string[] = [];
    const mediaCount = parseInt(numMedia || '0');
    for (let i = 0; i < mediaCount; i++) {
      const key = `MediaUrl${i}` as keyof TwilioSmsWebhook;
      if (webhook[key]) {
        mediaUrls.push(webhook[key] as string);
      }
    }

    // Check if this is from the owner
    const isOwner = from === business.owner_phone;

    if (isOwner) {
      await handleOwnerMessage(business, body, mediaUrls, res);
    } else {
      await handleCustomerMessage(business, from, body, mediaUrls, res);
    }
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).send('Error processing message');
  }
});

// ===========================================
// VOICE WEBHOOK - Missed Call Detection
// ===========================================

twilioRouter.post('/voice', async (req: Request, res: Response) => {
  try {
    const webhook = req.body as TwilioVoiceWebhook;
    const { From: from, To: to, CallStatus: status } = webhook;

    console.log(`📞 Call: ${from} → ${to} (${status})`);

    // Return TwiML to handle the call
    res.type('text/xml');
    res.send(generateMissedCallResponse());
  } catch (error) {
    console.error('Voice webhook error:', error);
    res.status(500).send('Error');
  }
});

// ===========================================
// CALL STATUS WEBHOOK - Trigger Missed Call Text-Back
// ===========================================

twilioRouter.post('/status', async (req: Request, res: Response) => {
  try {
    const { From: from, To: to, CallStatus: status } = req.body;

    // Only handle completed calls that were not answered
    if (status === 'completed' || status === 'no-answer' || status === 'busy') {
      const business = await getBusinessByTwilioNumber(to);

      if (business && (business.settings?.missed_call_textback || business.features_enabled?.missed_call_textback)) {
        // Don't text back the owner
        if (from !== business.owner_phone) {
          await handleMissedCall(business as Business, from);
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Status webhook error:', error);
    res.status(200).send('OK');
  }
});

// ===========================================
// OWNER MESSAGE HANDLING
// ===========================================

async function handleOwnerMessage(
  business: Business,
  body: string,
  mediaUrls: string[],
  res: Response
): Promise<void> {
  // Check if owner has media attached (social media post flow)
  if (mediaUrls.length > 0) {
    await handleSocialMediaFlow(business, body, mediaUrls, res);
    return;
  }

  // Parse owner command
  const command = await parseOwnerCommand(body);

  if (command) {
    await executeOwnerCommand(business, command, res);
  } else {
    // Not a recognized command - maybe they're replying to a conversation
    // For now, just acknowledge
    await sendSms(
      business.owner_phone,
      business.twilio_number!,
      `Didn't recognize that command. Text "help" for available commands.`
    );
    res.status(200).send('OK');
  }
}

async function executeOwnerCommand(
  business: Business,
  command: OwnerCommand,
  res: Response
): Promise<void> {
  let responseMessage = '';

  switch (command.type) {
    case 'pause':
      await updateBusinessSettings(business.id, { paused: true });
      responseMessage = '⏸️ GhostOps paused. Auto-replies disabled. Text "resume" to restart.';
      break;

    case 'resume':
      await updateBusinessSettings(business.id, { paused: false });
      responseMessage = '▶️ GhostOps resumed! Auto-replies are back on.';
      break;

    case 'status':
      const metrics = await getBusinessMetrics(business.id);
      responseMessage = `📊 Status:\n` +
        `• ${metrics.newLeads} new leads today\n` +
        `• ${metrics.appointmentsToday} appointments\n` +
        `• $${metrics.revenueWeek} revenue this week\n` +
        `• ${metrics.unpaidInvoices} unpaid ($${metrics.unpaidAmount})`;
      break;

    case 'invoice':
      const invoice = await createInvoice({
        business_id: business.id,
        contact_phone: '', // Phone will be looked up or prompted
        contact_name: command.customer,
        amount_cents: Math.round(command.amount * 100),
        description: command.description,
      });

      // Create Stripe payment link
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

      responseMessage = `💰 Invoice created!\n` +
        `• ${command.customer}: $${command.amount}\n` +
        `• ${command.description}\n\n` +
        `Reply with customer's phone number to send it.`;
      break;

    case 'unpaid':
      const unpaid = await getUnpaidInvoices(business.id);
      if (unpaid.length === 0) {
        responseMessage = '✅ No unpaid invoices!';
      } else {
        responseMessage = `📋 Unpaid invoices (${unpaid.length}):\n` +
          unpaid.slice(0, 5).map(inv =>
            `• ${inv.contact_name || 'Unknown'}: $${inv.amount_cents / 100}`
          ).join('\n');
        if (unpaid.length > 5) {
          responseMessage += `\n...and ${unpaid.length - 5} more`;
        }
      }
      break;

    case 'help':
      responseMessage = `📱 GhostOps Commands:\n\n` +
        `• pause - Stop auto-replies\n` +
        `• resume - Restart auto-replies\n` +
        `• status - Today's metrics\n` +
        `• invoice [name] [amount] [desc]\n` +
        `• unpaid - List unpaid invoices\n` +
        `• Send photo/video to create post`;
      break;

    default:
      responseMessage = 'Command not recognized. Text "help" for options.';
  }

  await sendSms(
    business.owner_phone,
    business.twilio_number!,
    responseMessage
  );

  res.status(200).send('OK');
}

// ===========================================
// SOCIAL MEDIA FLOW
// ===========================================

async function handleSocialMediaFlow(
  business: Business,
  body: string,
  mediaUrls: string[],
  res: Response
): Promise<void> {
  // Create conversation for this social media flow
  const conversation = await getOrCreateConversation(
    business.id,
    business.owner_phone
  );

  // Save the incoming message
  await saveMessage({
    conversation_id: conversation.id,
    business_id: business.id,
    direction: 'inbound',
    content: body,
    media_urls: mediaUrls,
  });

  // Generate caption options
  const captions = await generateCaptions(
    business,
    body || 'Photo/video for social media',
    ['instagram', 'facebook']
  );

  // Create social post record
  const post = await createSocialPost({
    business_id: business.id,
    content: body || 'Photo/video for social media',
    media_urls: mediaUrls,
    ai_options: captions,
    platforms: ['instagram', 'facebook'],
  });

  // Send caption options to owner
  const optionsMessage = `📸 Caption options for your post:\n\n` +
    `1️⃣ ${captions[0]}\n\n` +
    `2️⃣ ${captions[1]}\n\n` +
    `3️⃣ ${captions[2]}\n\n` +
    `Reply with 1, 2, or 3 to select, or type your own caption.`;

  await sendSms(
    business.owner_phone,
    business.twilio_number!,
    optionsMessage
  );

  await saveMessage({
    conversation_id: conversation.id,
    business_id: business.id,
    direction: 'outbound',
    content: optionsMessage,
  });

  res.status(200).send('OK');
}

// ===========================================
// CUSTOMER MESSAGE HANDLING
// ===========================================

async function handleCustomerMessage(
  business: Business,
  from: string,
  body: string,
  mediaUrls: string[],
  res: Response
): Promise<void> {
  // Get or create conversation
  const conversation = await getOrCreateConversation(
    business.id,
    from
  );

  // Save incoming message
  await saveMessage({
    conversation_id: conversation.id,
    business_id: business.id,
    direction: 'inbound',
    content: body,
    media_urls: mediaUrls,
  });

  // Get conversation history
  const history = await getConversationHistory(conversation.id);

  // Check if this is a new lead (first message in conversation)
  if (history.length <= 1) {
    await createLead({
      business_id: business.id,
      phone: from,
      source: 'sms_inquiry',
    });
  }

  // Generate AI response
  const aiResponse = await generateResponse(
    business,
    history,
    body,
    { type: 'general' }
  );

  // Save and send response
  await saveMessage({
    conversation_id: conversation.id,
    business_id: business.id,
    direction: 'outbound',
    content: aiResponse,
    ai_generated: true,
  });
  await sendSms(from, business.twilio_number!, aiResponse);

  res.status(200).send('OK');
}

// ===========================================
// MISSED CALL TEXT-BACK (Feature 1)
// ===========================================

async function handleMissedCall(
  business: Business,
  callerPhone: string
): Promise<void> {
  console.log(`📞 Missed call from ${callerPhone}, sending text-back`);

  // Create conversation
  const conversation = await getOrCreateConversation(
    business.id,
    callerPhone
  );

  // Create lead
  await createLead({
    business_id: business.id,
    phone: callerPhone,
    source: 'missed_call',
  });

  // Generate missed call response
  const response = await generateResponse(
    business,
    [],
    'I just called but no one answered',
    {
      type: 'missed_call',
      appointmentSlots: [
        'Tomorrow at 10am',
        'Tomorrow at 2pm',
        'Wednesday at 11am',
      ],
    }
  );

  // Save and send
  await saveMessage({
    conversation_id: conversation.id,
    business_id: business.id,
    direction: 'outbound',
    content: response,
    ai_generated: true,
  });
  await sendSms(callerPhone, business.twilio_number!, response);
}

// ===========================================
// SPEED-TO-LEAD WEBHOOK (Feature 2)
// ===========================================

twilioRouter.post('/lead-webhook', async (req: Request, res: Response) => {
  try {
    const { businessId, phone, name, source, message } = req.body;

    const { data: business } = await (await import('../../lib/supabase.js'))
      .supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (!business || business.settings?.paused) {
      return res.status(200).json({ success: false, reason: 'Business not found or paused' });
    }

    // Create conversation and lead
    const conversation = await getOrCreateConversation(
      business.id,
      phone
    );

    await createLead({
      business_id: business.id,
      phone,
      name,
      source: source || 'website_form',
    });

    // Save the lead's initial message if provided
    if (message) {
      await saveMessage({
        conversation_id: conversation.id,
        business_id: business.id,
        direction: 'inbound',
        content: message,
      });
    }

    // Generate speed-to-lead response
    const response = await generateResponse(
      business as Business,
      [],
      message || `Hi, I'm interested in your ${business.industry || 'business'} services`,
      {
        type: 'lead',
        leadInfo: { name, source },
      }
    );

    // Send within 60 seconds
    await saveMessage({
      conversation_id: conversation.id,
      business_id: business.id,
      direction: 'outbound',
      content: response,
      ai_generated: true,
    });
    await sendSms(phone, business.twilio_number!, response);

    console.log(`⚡ Speed-to-lead response sent to ${phone} within 60s`);

    res.status(200).json({ success: true, conversationId: conversation.id });
  } catch (error) {
    console.error('Lead webhook error:', error);
    res.status(500).json({ error: 'Failed to process lead' });
  }
});
