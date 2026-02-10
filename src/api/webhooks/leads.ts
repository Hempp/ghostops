// Lead Webhook Handler - Speed-to-Lead Engine
import { Router, Request, Response } from 'express';
import { supabase, getBusinessByTwilioNumber, createLead, getOrCreateContact, getOrCreateConversation, saveMessage, markLeadResponded, updateDailyStats } from '../../lib/supabase.js';
import { sendSms } from '../../lib/sms/twilio.js';
import { generateLeadResponse } from '../../lib/ai/claude.js';
import type { Business } from '../../types/index.js';

const router = Router();

interface LeadPayload {
  business_id?: string;
  twilio_number?: string;
  phone: string;
  name?: string;
  email?: string;
  message?: string;
  source: string;
  form_data?: Record<string, string>;
}

// Universal lead webhook - responds within 60 seconds
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const payload = req.body as LeadPayload;
    
    // Get business
    let business: Business | null = null;
    
    if (payload.business_id) {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', payload.business_id)
        .single();
      business = data;
    } else if (payload.twilio_number) {
      business = await getBusinessByTwilioNumber(payload.twilio_number);
    }
    
    if (!business) {
      return res.status(400).json({ error: 'Business not found' });
    }
    
    if (!business.features_enabled?.speed_to_lead || business.is_paused) {
      return res.json({ status: 'skipped', reason: 'Feature disabled or paused' });
    }
    
    // Create lead record
    const lead = await createLead({
      business_id: business.id,
      phone: payload.phone,
      name: payload.name,
      email: payload.email,
      source: payload.source,
      source_details: payload.form_data || {}
    });
    
    // Create contact and conversation
    const contact = await getOrCreateContact(business.id, payload.phone, payload.source);
    if (payload.name && !contact.name) {
      await supabase.from('contacts').update({ name: payload.name }).eq('id', contact.id);
    }
    
    const conversation = await getOrCreateConversation(business.id, payload.phone, contact.id);
    
    // Generate personalized response
    const responseMessage = await generateLeadResponse(business, {
      name: payload.name,
      message: payload.message,
      source: payload.source,
      formData: payload.form_data
    });
    
    // Send immediately
    const sid = await sendSms({
      to: payload.phone,
      from: business.twilio_number!,
      body: responseMessage
    });
    
    // Save message
    await saveMessage({
      conversation_id: conversation.id,
      business_id: business.id,
      direction: 'outbound',
      content: responseMessage,
      twilio_sid: sid,
      ai_generated: true
    });
    
    // Mark lead as responded
    await markLeadResponded(lead.id);
    
    // Update stats
    await updateDailyStats(business.id, { new_leads: 1, messages_sent: 1 });
    
    const responseTime = Date.now() - startTime;
    console.log('Lead response sent in ' + responseTime + 'ms');
    
    res.json({
      status: 'success',
      lead_id: lead.id,
      response_time_ms: responseTime,
      message_preview: responseMessage.substring(0, 50) + '...'
    });
  } catch (error) {
    console.error('Lead webhook error:', error);
    res.status(500).json({ error: 'Failed to process lead' });
  }
});

// Facebook Lead Ads webhook
router.post('/facebook', async (req: Request, res: Response) => {
  try {
    const { entry } = req.body;
    
    for (const e of entry || []) {
      for (const change of e.changes || []) {
        if (change.field === 'leadgen') {
          const leadgenId = change.value.leadgen_id;
          const pageId = change.value.page_id;
          
          // Get business by page ID
          const { data: business } = await supabase
            .from('businesses')
            .select('*')
            .eq('meta_page_id', pageId)
            .single();
          
          if (!business) continue;
          
          // Fetch lead data from Facebook
          const leadData = await fetchFacebookLead(leadgenId, business.meta_access_token);
          
          if (leadData) {
            // Forward to main lead handler
            await fetch(process.env.API_URL + '/webhooks/leads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                business_id: business.id,
                phone: leadData.phone,
                name: leadData.name,
                email: leadData.email,
                source: 'facebook_lead_ad',
                form_data: leadData.fields
              })
            });
          }
        }
      }
    }
    
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Facebook lead webhook error:', error);
    res.status(500).json({ error: 'Failed to process' });
  }
});

// Facebook webhook verification
router.get('/facebook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Helper to fetch Facebook lead data
async function fetchFacebookLead(leadgenId: string, accessToken: string | null): Promise<{
  phone: string;
  name: string;
  email: string;
  fields: Record<string, string>;
} | null> {
  if (!accessToken) return null;
  
  try {
    const response = await fetch(
      'https://graph.facebook.com/v18.0/' + leadgenId + '?access_token=' + accessToken
    );
    const data = await response.json() as { field_data?: Array<{ name: string; values: string[] }> };
    
    const fields: Record<string, string> = {};
    let phone = '';
    let name = '';
    let email = '';
    
    for (const field of data.field_data || []) {
      fields[field.name] = field.values[0];
      if (field.name === 'phone_number') phone = field.values[0];
      if (field.name === 'full_name') name = field.values[0];
      if (field.name === 'email') email = field.values[0];
    }
    
    return { phone, name, email, fields };
  } catch {
    return null;
  }
}

export default router;
