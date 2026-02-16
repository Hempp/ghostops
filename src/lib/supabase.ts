// Supabase Client - SUPA-MASTER
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Business Operations
export async function getBusinessByTwilioNumber(twilioNumber: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('twilio_number', twilioNumber)
    .single();
  if (error) throw error;
  return data;
}

export async function getBusinessByOwnerPhone(ownerPhone: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_phone', ownerPhone)
    .single();
  if (error) return null;
  return data;
}

// Contact Operations
export async function getOrCreateContact(businessId: string, phone: string, source?: string) {
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .single();

  if (existing) {
    await supabase.from('contacts')
      .update({ last_interaction_at: new Date().toISOString() })
      .eq('id', existing.id);
    return existing;
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert({ business_id: businessId, phone, source })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Conversation Operations
export async function getOrCreateConversation(businessId: string, phone: string, contactId?: string) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ business_id: businessId, phone, contact_id: contactId, status: 'active' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRecentMessages(conversationId: string, limit = 10) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data?.reverse() || [];
}

export async function saveMessage(message: {
  conversation_id: string;
  business_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  media_urls?: string[];
  twilio_sid?: string;
  ai_generated?: boolean;
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();
  if (error) throw error;
  
  // Update conversation last_message_at
  await supabase.from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', message.conversation_id);
  
  return data;
}

// Appointment Operations
export async function createAppointment(appointment: {
  business_id: string;
  contact_id?: string;
  contact_phone: string;
  contact_name?: string;
  service?: string;
  scheduled_at: string;
  source?: string;
}) {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTodaysAppointments(businessId: string) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
  
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .gte('scheduled_at', startOfDay)
    .lte('scheduled_at', endOfDay)
    .order('scheduled_at');
  if (error) throw error;
  return data || [];
}

// Invoice Operations
export async function createInvoice(invoice: {
  business_id: string;
  contact_phone: string;
  contact_name?: string;
  amount_cents: number;
  description: string;
}) {
  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...invoice, status: 'draft' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUnpaidInvoices(businessId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .in('status', ['sent', 'viewed', 'overdue'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getOverdueInvoices(businessId: string) {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'sent')
    .lt('sent_at', threeDaysAgo);
  if (error) throw error;
  return data || [];
}

// Lead Operations
export async function createLead(lead: {
  business_id: string;
  phone: string;
  name?: string;
  email?: string;
  source: string;
  source_details?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markLeadResponded(leadId: string) {
  const now = new Date();
  const { data: lead } = await supabase
    .from('leads')
    .select('received_at')
    .eq('id', leadId)
    .single();
  
  const receivedAt = lead?.received_at ? new Date(lead.received_at) : now;
  const responseTimeSeconds = Math.floor((now.getTime() - receivedAt.getTime()) / 1000);
  
  await supabase.from('leads').update({
    first_response_at: now.toISOString(),
    response_time_seconds: responseTimeSeconds,
    status: 'contacted'
  }).eq('id', leadId);
}

// Missed Call Operations
export async function recordMissedCall(missedCall: {
  business_id: string;
  caller_phone: string;
  caller_name?: string;
  twilio_call_sid?: string;
}) {
  const { data, error } = await supabase
    .from('missed_calls')
    .insert(missedCall)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Social Post Operations
export async function createSocialPost(post: {
  business_id: string;
  content: string;
  media_urls?: string[];
  ai_options?: string[];
  platforms?: string[];
}) {
  const { data, error } = await supabase
    .from('social_posts')
    .insert({ ...post, status: 'draft' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPendingPosts(businessId: string) {
  const { data, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'pending_approval');
  if (error) throw error;
  return data || [];
}

// Review Operations
export async function getRecentReviews(businessId: string, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Stats Operations
export async function getDailyStats(businessId: string, date: string) {
  const { data } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', date)
    .single();
  return data;
}

export async function updateDailyStats(businessId: string, updates: Partial<{
  messages_sent: number;
  messages_received: number;
  missed_calls: number;
  new_leads: number;
  invoices_sent: number;
  invoices_paid: number;
  revenue_cents: number;
}>) {
  const date = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', date)
    .single();

  if (existing) {
    const newValues: Record<string, number> = {};
    for (const [key, value] of Object.entries(updates)) {
      newValues[key] = ((existing as Record<string, number>)[key] || 0) + (value as number);
    }
    await supabase.from('daily_stats').update(newValues).eq('id', existing.id);
  } else {
    await supabase.from('daily_stats').insert({ business_id: businessId, date, ...updates });
  }
}

// Get all active businesses for cron jobs
export async function getActiveBusinesses() {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('is_active', true)
    .eq('is_paused', false);
  if (error) throw error;
  return data || [];
}

// Owner Conversation Operations
export async function getOrCreateOwnerConversation(businessId: string, ownerPhone: string) {
  const { data: existing } = await supabase
    .from('owner_conversations')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('owner_conversations')
    .insert({ business_id: businessId, owner_phone: ownerPhone })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOwnerMessages(businessId: string, limit = 10) {
  const { data, error } = await supabase
    .from('owner_messages')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data?.reverse() || [];
}

export async function saveOwnerMessage(message: {
  business_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
}) {
  const { data, error } = await supabase
    .from('owner_messages')
    .insert(message)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Business Intelligence - Aggregate data for co-founder AI context
export async function getBusinessIntelligence(businessId: string) {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Weekly stats
  const { data: weeklyStats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .gte('date', weekAgo);

  // Unpaid invoices
  const { data: unpaidInvoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .in('status', ['sent', 'viewed', 'overdue']);

  // Recent leads
  const { data: recentLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: false });

  // Today's appointments
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todaysAppointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at');

  // Recent reviews
  const { data: recentReviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', monthAgo)
    .order('created_at', { ascending: false });

  // Pending posts
  const { data: pendingPosts } = await supabase
    .from('social_posts')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'pending_approval');

  // Monthly revenue
  const { data: monthlyInvoices } = await supabase
    .from('invoices')
    .select('amount_cents, status')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('paid_at', monthAgo);

  return {
    weeklyStats: weeklyStats || [],
    unpaidInvoices: unpaidInvoices || [],
    recentLeads: recentLeads || [],
    todaysAppointments: todaysAppointments || [],
    recentReviews: recentReviews || [],
    pendingPosts: pendingPosts || [],
    monthlyRevenue: monthlyInvoices?.reduce((sum, i) => sum + i.amount_cents, 0) || 0
  };
}
