// ===========================================
// TWILIO SERVICE
// EDGE-RUNNER Agent: SMS & Voice Integration
// ===========================================

import twilio from 'twilio';
import type { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message.js';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// ===========================================
// SMS OPERATIONS
// ===========================================

export async function sendSms(
  to: string,
  from: string,
  body: string,
  mediaUrls?: string[]
): Promise<MessageInstance> {
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
): Promise<MessageInstance[]> {
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
  const searchParams: { limit: number; smsEnabled: boolean; voiceEnabled: boolean; areaCode?: string } = {
    limit: 1,
    smsEnabled: true,
    voiceEnabled: true,
  };

  if (areaCode) {
    searchParams.areaCode = areaCode;
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
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  );
}

// ===========================================
// MESSAGE HISTORY
// ===========================================

export async function getMessageHistory(
  from: string,
  to: string,
  limit = 20
): Promise<MessageInstance[]> {
  const messages = await client.messages.list({
    from,
    to,
    limit,
  });

  return messages;
}
