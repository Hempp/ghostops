// ===========================================
// TWILIO SERVICE
// EDGE-RUNNER Agent: SMS & Voice Integration
// ===========================================

import twilio from 'twilio';
import type { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message.js';

// Lazy initialization - only create client when needed and credentials exist
let _client: ReturnType<typeof twilio> | null = null;

function getClient(): ReturnType<typeof twilio> | null {
  if (!_client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token || sid === 'FILL_ME_IN' || !sid.startsWith('AC')) {
      console.warn('Twilio credentials not configured - SMS/Voice disabled');
      return null;
    }
    _client = twilio(sid, token);
  }
  return _client;
}

// ===========================================
// SMS OPERATIONS
// ===========================================

export async function sendSms(
  to: string,
  from: string,
  body: string,
  mediaUrls?: string[]
): Promise<MessageInstance | null> {
  const client = getClient();
  if (!client) {
    console.warn(`SMS skipped (Twilio not configured): ${to}`);
    return null;
  }

  const messageOptions: {
    to: string;
    from: string;
    body: string;
    mediaUrl?: string[];
  } = {
    to,
    from,
    body,
  };

  if (mediaUrls?.length) {
    messageOptions.mediaUrl = mediaUrls;
  }

  return await client.messages.create(messageOptions);
}

export async function sendBulkSms(
  messages: Array<{
    to: string;
    from: string;
    body: string;
    mediaUrls?: string[];
  }>
): Promise<(MessageInstance | null)[]> {
  return await Promise.all(
    messages.map((msg) => sendSms(msg.to, msg.from, msg.body, msg.mediaUrls))
  );
}

// ===========================================
// PHONE NUMBER MANAGEMENT
// ===========================================

export async function purchasePhoneNumber(
  areaCode?: string
): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error('Twilio not configured');
  }

  const searchParams: { limit: number; smsEnabled: boolean; voiceEnabled: boolean; areaCode?: number } = {
    limit: 1,
    smsEnabled: true,
    voiceEnabled: true,
  };

  if (areaCode) {
    searchParams.areaCode = parseInt(areaCode, 10);
  }

  const availableNumbers = await client
    .availablePhoneNumbers('US')
    .local.list(searchParams);

  if (!availableNumbers.length) {
    throw new Error('No available phone numbers found');
  }

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: availableNumbers[0].phoneNumber,
    smsUrl: `${process.env.API_URL}/webhooks/twilio/sms`,
    smsMethod: 'POST',
    voiceUrl: `${process.env.API_URL}/webhooks/twilio/voice`,
    voiceMethod: 'POST',
    statusCallback: `${process.env.API_URL}/webhooks/twilio/status`,
    statusCallbackMethod: 'POST',
  });

  return purchased.phoneNumber;
}

export async function configurePhoneNumber(
  phoneNumber: string,
  webhookBaseUrl: string
): Promise<void> {
  const client = getClient();
  if (!client) {
    throw new Error('Twilio not configured');
  }

  const numbers = await client.incomingPhoneNumbers.list({
    phoneNumber,
    limit: 1,
  });

  if (!numbers.length) {
    throw new Error(`Phone number ${phoneNumber} not found in account`);
  }

  await client.incomingPhoneNumbers(numbers[0].sid).update({
    smsUrl: `${webhookBaseUrl}/webhooks/twilio/sms`,
    smsMethod: 'POST',
    voiceUrl: `${webhookBaseUrl}/webhooks/twilio/voice`,
    voiceMethod: 'POST',
    statusCallback: `${webhookBaseUrl}/webhooks/twilio/status`,
    statusCallbackMethod: 'POST',
  });
}

// ===========================================
// VOICE OPERATIONS
// ===========================================

export function generateMissedCallResponse(): string {
  // Returns TwiML that immediately ends the call
  // The actual handling happens via status callback
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're sorry we missed your call. We'll text you right back!</Say>
  <Hangup/>
</Response>`;
}

export function generateVoicemailResponse(businessName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, you've reached ${businessName}. We're currently unavailable, but we'll text you right back. You can also leave a message after the beep.</Say>
  <Record maxLength="120" transcribe="true" transcribeCallback="/webhooks/twilio/transcription"/>
  <Say voice="alice">We didn't receive a recording. We'll text you shortly!</Say>
</Response>`;
}

// ===========================================
// VALIDATION
// ===========================================

export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || token === 'FILL_ME_IN') return true; // Skip validation if not configured
  return twilio.validateRequest(token, signature, url, params);
}

// ===========================================
// MESSAGE HISTORY
// ===========================================

export async function getMessageHistory(
  from: string,
  to: string,
  limit = 20
): Promise<MessageInstance[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  const messages = await client.messages.list({
    from,
    to,
    limit,
  });

  return messages;
}
