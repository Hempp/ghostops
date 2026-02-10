// Twilio SMS Service - VELOCITY Communications
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

const client = twilio(accountSid, authToken);

export interface SendSmsOptions {
  to: string;
  from: string;
  body: string;
  mediaUrls?: string[];
}

export async function sendSms(options: SendSmsOptions): Promise<string> {
  const { to, from, body, mediaUrls } = options;
  
  const messageParams: {
    to: string;
    from: string;
    body: string;
    mediaUrl?: string[];
  } = { to, from, body };
  
  if (mediaUrls && mediaUrls.length > 0) {
    messageParams.mediaUrl = mediaUrls;
  }
  
  const message = await client.messages.create(messageParams);
  
  console.log(`SMS sent: ${message.sid} to ${to}`);
  return message.sid;
}

export async function sendBulkSms(
  messages: Array<Omit<SendSmsOptions, 'from'>>,
  fromNumber: string
): Promise<string[]> {
  const results: string[] = [];
  
  // Twilio rate limits: send sequentially with small delays
  for (const msg of messages) {
    try {
      const sid = await sendSms({ ...msg, from: fromNumber });
      results.push(sid);
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to send to ${msg.to}:`, error);
      results.push('');
    }
  }
  
  return results;
}

// Validate Twilio webhook signature
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}

// Format phone number to E.164
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's a US number without country code, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Otherwise assume it's already formatted
  return phone.startsWith('+') ? phone : `+${digits}`;
}

// Parse incoming phone number
export function parsePhoneNumber(phone: string): {
  formatted: string;
  digits: string;
  countryCode: string;
} {
  const formatted = formatPhoneNumber(phone);
  const digits = formatted.replace(/\D/g, '');
  const countryCode = digits.substring(0, digits.length - 10);
  
  return { formatted, digits, countryCode };
}

export { client as twilioClient };
