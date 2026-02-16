// Twilio Webhook Handlers - VELOCITY Communications
import { Router, Request, Response } from 'express';
import { supabase, getBusinessByTwilioNumber, getBusinessByOwnerPhone, getOrCreateContact, getOrCreateConversation, getRecentMessages, saveMessage, recordMissedCall, createLead, markLeadResponded, updateDailyStats, getOrCreateOwnerConversation, getOwnerMessages, saveOwnerMessage, getBusinessIntelligence } from '../../lib/supabase.js';
import { sendSms, formatPhoneNumber, validateTwilioSignature } from '../../lib/sms/twilio.js';
import { generateCustomerResponse, generateMissedCallTextback, generateSocialPostOptions, generateCofounderResponse } from '../../lib/ai/claude.js';
import { parseOwnerCommand, getHelpMessage, formatStatusMessage, formatUnpaidList, formatPostOptions, isConversationalMessage } from '../../lib/commands/parser.js';
import { createInvoicePaymentLink } from '../../lib/payments/stripe.js';
import { webhookRateLimiter } from '../../middleware/rateLimit.js';
import type { TwilioSmsWebhook, TwilioVoiceWebhook, Business } from '../../types/index.js';

const router = Router();

// Validate Twilio webhook signature middleware
function validateTwilioWebhook(req: Request, res: Response, next: Function): void {
  const signature = req.headers['x-twilio-signature'] as string;

  if (!signature) {
    console.warn('Missing Twilio signature header');
    res.status(403).send('<Response><Message>Invalid request</Message></Response>');
    return;
  }

  // Construct the full URL for validation
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const url = `${protocol}://${host}${req.originalUrl}`;

  const isValid = validateTwilioSignature(signature, url, req.body);

  if (!isValid) {
    console.warn('Invalid Twilio signature for URL:', url);
    res.status(403).send('<Response><Message>Invalid signature</Message></Response>');
    return;
  }

  next();
}

// Inbound SMS Webhook
router.post('/sms', webhookRateLimiter, validateTwilioWebhook, async (req: Request, res: Response) => {
  try {
    const webhook = req.body as TwilioSmsWebhook;
    const fromPhone = formatPhoneNumber(webhook.From);
    const toPhone = formatPhoneNumber(webhook.To);
    const messageBody = webhook.Body?.trim() || '';
    
    // Get business by Twilio number
    const business = await getBusinessByTwilioNumber(toPhone);
    if (!business) {
      console.error('No business found for number:', toPhone);
      return res.status(200).send('<Response></Response>');
    }
    
    // Check if this is the owner texting
    const isOwner = formatPhoneNumber(business.owner_phone) === fromPhone;
    
    // Collect media URLs if MMS
    const mediaUrls: string[] = [];
    const numMedia = parseInt(webhook.NumMedia || '0');
    for (let i = 0; i < numMedia; i++) {
      const urlKey = 'MediaUrl' + i as keyof TwilioSmsWebhook;
      if (webhook[urlKey]) mediaUrls.push(webhook[urlKey] as string);
    }
    
    if (isOwner) {
      await handleOwnerMessage(business, messageBody, mediaUrls);
    } else {
      await handleCustomerMessage(business, fromPhone, messageBody, mediaUrls, webhook.MessageSid);
    }
    
    // Return empty TwiML (we send responses via API)
    res.type('text/xml').send('<Response></Response>');
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).send('<Response></Response>');
  }
});

// Handle owner commands
async function handleOwnerMessage(business: Business, message: string, mediaUrls: string[]): Promise<void> {
  // Check if message is conversational (co-founder AI mode)
  if (isConversationalMessage(message)) {
    // Get owner conversation history
    const recentMessages = await getOwnerMessages(business.id, 10);

    // Get business intelligence for context
    const intelligence = await getBusinessIntelligence(business.id);

    // Save inbound owner message
    await saveOwnerMessage({
      business_id: business.id,
      direction: 'inbound',
      content: message
    });

    // Generate co-founder AI response
    const cofounderResponse = await generateCofounderResponse(
      business,
      message,
      recentMessages,
      intelligence
    );

    // Send response via SMS
    await sendSms({
      to: business.owner_phone,
      from: business.twilio_number!,
      body: cofounderResponse.message
    });

    // Save outbound message
    await saveOwnerMessage({
      business_id: business.id,
      direction: 'outbound',
      content: cofounderResponse.message,
      ai_generated: true
    });

    return;
  }

  // Check if owner is responding to a social post flow
  const { data: pendingPost } = await supabase
    .from('social_posts')
    .select('*')
    .eq('business_id', business.id)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (pendingPost && /^[1-3]$/.test(message.trim())) {
    // Owner selected a post option
    const selectedIndex = parseInt(message.trim()) - 1;
    const selectedCaption = pendingPost.ai_options[selectedIndex];
    
    await supabase.from('social_posts').update({
      content: selectedCaption,
      selected_option: selectedIndex,
      status: 'approved'
    }).eq('id', pendingPost.id);
    
    await sendSms({
      to: business.owner_phone,
      from: business.twilio_number!,
      body: 'Post approved! Reply "post now" to publish immediately or "schedule tomorrow 10am" to schedule.'
    });
    return;
  }
  
  // Check if owner is sending media for social post
  if (mediaUrls.length > 0) {
    const description = message || 'Photo/video for social media';
    const options = await generateSocialPostOptions(business, description, message);
    
    await supabase.from('social_posts').insert({
      business_id: business.id,
      content: '',
      media_urls: mediaUrls,
      ai_options: options,
      status: 'pending_approval'
    });
    
    await sendSms({
      to: business.owner_phone,
      from: business.twilio_number!,
      body: formatPostOptions(options)
    });
    return;
  }
  
  // Parse as command
  const command = parseOwnerCommand(message);
  
  switch (command.type) {
    case 'pause':
      await supabase.from('businesses').update({ is_paused: true }).eq('id', business.id);
      await sendSms({ to: business.owner_phone, from: business.twilio_number!, body: 'Auto-responses paused. Reply "resume" to restart.' });
      break;
      
    case 'resume':
      await supabase.from('businesses').update({ is_paused: false }).eq('id', business.id);
      await sendSms({ to: business.owner_phone, from: business.twilio_number!, body: 'Auto-responses resumed!' });
      break;
      
    case 'help':
      await sendSms({ to: business.owner_phone, from: business.twilio_number!, body: getHelpMessage() });
      break;
      
    case 'status': {
      const stats = await getOwnerStats(business);
      await sendSms({ to: business.owner_phone, from: business.twilio_number!, body: formatStatusMessage(stats) });
      break;
    }
      
    case 'unpaid': {
      const { data: unpaid } = await supabase
        .from('invoices')
        .select('*')
        .eq('business_id', business.id)
        .in('status', ['sent', 'viewed', 'overdue'])
        .order('created_at', { ascending: false });
      await sendSms({ to: business.owner_phone, from: business.twilio_number!, body: formatUnpaidList(unpaid || []) });
      break;
    }
      
    case 'invoice': {
      // Find contact by name or create
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('business_id', business.id)
        .ilike('name', '%' + command.contact_name + '%')
        .limit(1)
        .single();
      
      if (!contact) {
        await sendSms({ to: business.owner_phone, from: business.twilio_number!, body: 'Contact "' + command.contact_name + '" not found. Text their phone number to create invoice.' });
        return;
      }
      
      const invoice = await supabase.from('invoices').insert({
        business_id: business.id,
        contact_id: contact.id,
        contact_phone: contact.phone,
        contact_name: contact.name,
        amount_cents: Math.round(command.amount * 100),
        description: command.description,
        status: 'draft'
      }).select().single();
      
      if (invoice.data) {
        const { paymentLink } = await createInvoicePaymentLink(invoice.data, business);
        await sendSms({
          to: contact.phone,
          from: business.twilio_number!,
          body: 'Hi ' + (contact.name || 'there') + '! Here\'s your invoice from ' + business.name + ': $' + command.amount.toFixed(2) + ' for ' + command.description + '. Pay securely: ' + paymentLink
        });
        await sendSms({ to: business.owner_phone, from: business.twilio_number!, body: 'Invoice sent to ' + contact.name + '!' });
        await updateDailyStats(business.id, { invoices_sent: 1 });
      }
      break;
    }
      
    default:
      await sendSms({ to: business.owner_phone, from: business.twilio_number!, body: 'Unknown command. Reply "help" for available commands.' });
  }
}

// Handle customer messages
async function handleCustomerMessage(
  business: Business,
  fromPhone: string,
  message: string,
  mediaUrls: string[],
  twilioSid: string
): Promise<void> {
  // Check if business is paused
  if (business.is_paused) {
    console.log('Business is paused, not responding');
    return;
  }
  
  // Get or create contact and conversation
  const contact = await getOrCreateContact(business.id, fromPhone, 'sms');
  const conversation = await getOrCreateConversation(business.id, fromPhone, contact.id);
  
  // Save inbound message
  await saveMessage({
    conversation_id: conversation.id,
    business_id: business.id,
    direction: 'inbound',
    content: message,
    media_urls: mediaUrls,
    twilio_sid: twilioSid
  });
  
  // Update stats
  await updateDailyStats(business.id, { messages_received: 1 });
  
  // Get recent messages for context
  const recentMessages = await getRecentMessages(conversation.id, 10);
  
  // Generate AI response
  const aiResponse = await generateCustomerResponse(
    { business, conversation, contact, recentMessages },
    message
  );
  
  // Send response
  const sid = await sendSms({
    to: fromPhone,
    from: business.twilio_number!,
    body: aiResponse.message
  });
  
  // Save outbound message
  await saveMessage({
    conversation_id: conversation.id,
    business_id: business.id,
    direction: 'outbound',
    content: aiResponse.message,
    twilio_sid: sid,
    ai_generated: true
  });
  
  await updateDailyStats(business.id, { messages_sent: 1 });
  
  // Handle actions
  if (aiResponse.action?.type === 'escalate_to_owner') {
    await sendSms({
      to: business.owner_phone,
      from: business.twilio_number!,
      body: 'Need attention: ' + fromPhone + ' - "' + message.substring(0, 100) + '"'
    });
  }
}

// Voice webhook - missed call handler
router.post('/voice', webhookRateLimiter, validateTwilioWebhook, async (req: Request, res: Response) => {
  try {
    const webhook = req.body as TwilioVoiceWebhook;
    
    // Only handle missed calls (no-answer, busy)
    if (!['no-answer', 'busy', 'failed'].includes(webhook.CallStatus)) {
      return res.type('text/xml').send('<Response><Say>Thank you for calling!</Say></Response>');
    }
    
    const fromPhone = formatPhoneNumber(webhook.From);
    const toPhone = formatPhoneNumber(webhook.To);
    
    const business = await getBusinessByTwilioNumber(toPhone);
    if (!business || !business.features_enabled?.missed_call_textback) {
      return res.type('text/xml').send('<Response></Response>');
    }
    
    // Record missed call
    const missedCall = await recordMissedCall({
      business_id: business.id,
      caller_phone: fromPhone,
      caller_name: webhook.CallerName,
      twilio_call_sid: webhook.CallSid
    });
    
    // Generate and send text-back
    const textbackMessage = await generateMissedCallTextback(business, webhook.CallerName);
    
    await sendSms({
      to: fromPhone,
      from: business.twilio_number!,
      body: textbackMessage
    });
    
    // Update missed call record
    await supabase.from('missed_calls').update({
      textback_sent: true,
      textback_sent_at: new Date().toISOString()
    }).eq('id', missedCall.id);
    
    // Create lead from missed call
    await createLead({
      business_id: business.id,
      phone: fromPhone,
      name: webhook.CallerName,
      source: 'missed_call'
    });
    
    await updateDailyStats(business.id, { missed_calls: 1, new_leads: 1 });
    
    res.type('text/xml').send('<Response></Response>');
  } catch (error) {
    console.error('Voice webhook error:', error);
    res.status(500).send('<Response></Response>');
  }
});

// Helper to get owner stats
async function getOwnerStats(business: Business) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: stats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('business_id', business.id)
    .eq('date', today)
    .single();
  
  const { data: unpaid } = await supabase
    .from('invoices')
    .select('amount_cents')
    .eq('business_id', business.id)
    .in('status', ['sent', 'viewed', 'overdue']);
  
  const { count: pendingPosts } = await supabase
    .from('social_posts')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .eq('status', 'pending_approval');
  
  return {
    isPaused: business.is_paused,
    todayLeads: stats?.new_leads || 0,
    todayMessages: (stats?.messages_sent || 0) + (stats?.messages_received || 0),
    pendingPosts: pendingPosts || 0,
    unpaidInvoices: unpaid?.length || 0,
    unpaidTotal: unpaid?.reduce((sum, i) => sum + i.amount_cents, 0) || 0
  };
}

export default router;
