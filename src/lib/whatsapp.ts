// ===========================================
// WHATSAPP CLOUD API SERVICE
// Meta WhatsApp Business API Integration
// ===========================================

export interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'template' | 'image' | 'document';
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: string;
      parameters: Array<{ type: string; text?: string }>;
    }>;
  };
}

export interface WhatsAppWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'location' | 'contacts' | 'button' | 'interactive';
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  button?: { text: string; payload: string };
  interactive?: { type: string; button_reply?: { id: string; title: string } };
}

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: WhatsAppWebhookMessage[];
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// ===========================================
// SEND WHATSAPP MESSAGE
// ===========================================

export async function sendWhatsAppMessage(
  to: string,
  message: string,
  phoneNumberId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !accessToken) {
    console.error('WhatsApp credentials not configured');
    return { success: false, error: 'WhatsApp not configured' };
  }

  // Clean phone number (remove + and spaces)
  const cleanPhone = to.replace(/[\s+-]/g, '');

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message },
      } as WhatsAppMessage),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      return { success: false, error: data.error?.message || 'Unknown error' };
    }

    console.log(`✅ WhatsApp sent to ${cleanPhone}: ${message.substring(0, 50)}...`);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: String(error) };
  }
}

// ===========================================
// SEND WHATSAPP TEMPLATE (for 24hr+ window)
// ===========================================

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  parameters?: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !accessToken) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  const cleanPhone = to.replace(/[\s+-]/g, '');

  const message: WhatsAppMessage = {
    messaging_product: 'whatsapp',
    to: cleanPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  if (parameters && parameters.length > 0) {
    message.template!.components = [
      {
        type: 'body',
        parameters: parameters.map((text) => ({ type: 'text', text })),
      },
    ];
  }

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp template error:', data);
      return { success: false, error: data.error?.message || 'Unknown error' };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('WhatsApp template error:', error);
    return { success: false, error: String(error) };
  }
}

// ===========================================
// VERIFY WEBHOOK (for Meta verification)
// ===========================================

export function verifyWebhook(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined
): { valid: boolean; challenge?: string } {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WhatsApp webhook verified');
    return { valid: true, challenge };
  }

  console.error('❌ WhatsApp webhook verification failed');
  return { valid: false };
}

// ===========================================
// PARSE WEBHOOK PAYLOAD
// ===========================================

export function parseWebhookPayload(payload: WhatsAppWebhookPayload): {
  phoneNumberId: string;
  from: string;
  fromName: string;
  messageId: string;
  messageType: string;
  text: string;
  mediaId?: string;
  timestamp: Date;
} | null {
  try {
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.messages?.[0]) {
      return null; // Might be a status update, not a message
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    let text = '';
    if (message.type === 'text') {
      text = message.text?.body || '';
    } else if (message.type === 'button') {
      text = message.button?.text || '';
    } else if (message.type === 'interactive') {
      text = message.interactive?.button_reply?.title || '';
    } else if (message.type === 'image' && message.image?.caption) {
      text = message.image.caption;
    }

    return {
      phoneNumberId: value.metadata.phone_number_id,
      from: message.from,
      fromName: contact?.profile?.name || 'Unknown',
      messageId: message.id,
      messageType: message.type,
      text,
      mediaId: message.type === 'image' ? message.image?.id : undefined,
      timestamp: new Date(parseInt(message.timestamp) * 1000),
    };
  } catch (error) {
    console.error('Error parsing WhatsApp webhook:', error);
    return null;
  }
}

// ===========================================
// MARK MESSAGE AS READ
// ===========================================

export async function markAsRead(messageId: string): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !accessToken) return;

  try {
    await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
}
