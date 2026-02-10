// Scheduler Service - FLUX-OPS Automation
import cron from 'node-cron';
import { supabase, getActiveBusinesses, getOverdueInvoices, getTodaysAppointments } from '../supabase.js';
import { generateMorningBriefing } from '../ai/claude.js';
import { sendSms } from '../sms/twilio.js';
import { publishSocialPost } from '../social/meta.js';
import type { Business, SocialPost, Invoice } from '../../types/index.js';

// Initialize all cron jobs
export function initializeScheduler(): void {
  console.log('Initializing GhostOps scheduler...');
  
  // Morning briefing - runs at configured hour for each business
  cron.schedule('0 * * * *', async () => {
    await sendMorningBriefings();
  });
  
  // Invoice reminders - check every hour
  cron.schedule('0 * * * *', async () => {
    await sendInvoiceReminders();
  });
  
  // Scheduled posts - check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await publishScheduledPosts();
  });
  
  // Daily stats aggregation - midnight
  cron.schedule('0 0 * * *', async () => {
    await aggregateDailyStats();
  });
  
  console.log('Scheduler initialized with 4 cron jobs');
}

// Send morning briefings to all active businesses
async function sendMorningBriefings(): Promise<void> {
  const currentHour = new Date().getUTCHours();
  const businesses = await getActiveBusinesses();
  
  for (const business of businesses) {
    // Convert business timezone to check if it's their briefing hour
    const briefingHour = parseInt(process.env.MORNING_BRIEFING_HOUR || '8');
    const tzOffset = getTimezoneOffset(business.timezone);
    const localHour = (currentHour + tzOffset + 24) % 24;
    
    if (localHour !== briefingHour) continue;
    if (!business.features_enabled?.morning_briefing) continue;
    
    try {
      const stats = await gatherBriefingStats(business);
      const message = await generateMorningBriefing(business, stats);
      
      if (message && business.owner_phone && business.twilio_number) {
        await sendSms({
          to: business.owner_phone,
          from: business.twilio_number,
          body: message
        });
        console.log('Morning briefing sent to', business.name);
      }
    } catch (error) {
      console.error('Error sending briefing to', business.name, error);
    }
  }
}

// Gather stats for morning briefing
async function gatherBriefingStats(business: Business) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // Get yesterday's stats
  const { data: dailyStats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('business_id', business.id)
    .eq('date', yesterdayStr)
    .single();
  
  // Get today's appointments
  const appointments = await getTodaysAppointments(business.id);
  
  // Get overdue invoices
  const overdueInvoices = await getOverdueInvoices(business.id);
  
  // Get recent reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('business_id', business.id)
    .gte('created_at', yesterday.toISOString());
  
  // Get scheduled posts for today
  const { data: scheduledPosts } = await supabase
    .from('social_posts')
    .select('id')
    .eq('business_id', business.id)
    .eq('status', 'scheduled');
  
  const reviewRatings = (reviews || []).map(r => r.rating).filter(Boolean) as number[];
  const avgRating = reviewRatings.length > 0 
    ? reviewRatings.reduce((a, b) => a + b, 0) / reviewRatings.length 
    : 0;
  
  return {
    newLeads: dailyStats?.new_leads || 0,
    leadsAutoResponded: dailyStats?.new_leads || 0,
    appointmentsToday: appointments.map(a => ({
      time: new Date(a.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      name: a.contact_name || undefined,
      service: a.service || undefined
    })),
    newReviews: (reviews || []).map(r => ({ rating: r.rating || 0 })),
    avgRating,
    missedCallsRecovered: dailyStats?.missed_calls || 0,
    revenueYesterday: dailyStats?.revenue_cents || 0,
    postsPublished: dailyStats?.posts_published || 0,
    totalReach: 0,
    overdueInvoices: overdueInvoices.map(i => ({
      name: i.contact_name || undefined,
      amount: i.amount_cents
    })),
    tasksHandled: (dailyStats?.messages_sent || 0) + (dailyStats?.messages_received || 0)
  };
}

// Send invoice reminders (3-day and 7-day)
async function sendInvoiceReminders(): Promise<void> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // 3-day reminders
  const { data: threeDay } = await supabase
    .from('invoices')
    .select('*, businesses(*)')
    .eq('status', 'sent')
    .eq('reminder_3day_sent', false)
    .lt('sent_at', threeDaysAgo.toISOString());
  
  for (const invoice of threeDay || []) {
    const business = invoice.businesses as unknown as Business;
    if (!business?.twilio_number) continue;
    
    const amount = (invoice.amount_cents / 100).toFixed(2);
    const message = 'Hi ' + (invoice.contact_name || 'there') + '! Friendly reminder: your invoice for $' + amount + ' from ' + business.name + ' is still pending. Pay here: ' + invoice.stripe_hosted_url;
    
    await sendSms({
      to: invoice.contact_phone,
      from: business.twilio_number,
      body: message
    });
    
    await supabase.from('invoices')
      .update({ reminder_3day_sent: true })
      .eq('id', invoice.id);
  }
  
  // 7-day reminders
  const { data: sevenDay } = await supabase
    .from('invoices')
    .select('*, businesses(*)')
    .eq('status', 'sent')
    .eq('reminder_7day_sent', false)
    .lt('sent_at', sevenDaysAgo.toISOString());
  
  for (const invoice of sevenDay || []) {
    const business = invoice.businesses as unknown as Business;
    if (!business?.twilio_number) continue;
    
    const amount = (invoice.amount_cents / 100).toFixed(2);
    const message = 'Hi ' + (invoice.contact_name || 'there') + ', your invoice of $' + amount + ' from ' + business.name + ' is now 7 days overdue. Please complete payment: ' + invoice.stripe_hosted_url;
    
    await sendSms({
      to: invoice.contact_phone,
      from: business.twilio_number,
      body: message
    });
    
    await supabase.from('invoices')
      .update({ reminder_7day_sent: true, status: 'overdue' })
      .eq('id', invoice.id);
  }
}

// Publish scheduled social posts
async function publishScheduledPosts(): Promise<void> {
  const now = new Date();
  
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*, businesses(*)')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now.toISOString());
  
  for (const post of posts || []) {
    const business = post.businesses as unknown as Business;
    if (!business) continue;
    
    try {
      await publishSocialPost(post as SocialPost, business);
      console.log('Published scheduled post', post.id);
    } catch (error) {
      console.error('Failed to publish post', post.id, error);
    }
  }
}

// Aggregate daily stats at midnight
async function aggregateDailyStats(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  const businesses = await getActiveBusinesses();
  
  for (const business of businesses) {
    // Check if stats already exist
    const { data: existing } = await supabase
      .from('daily_stats')
      .select('id')
      .eq('business_id', business.id)
      .eq('date', dateStr)
      .single();
    
    if (existing) continue;
    
    // Count messages
    const startOfDay = dateStr + 'T00:00:00Z';
    const endOfDay = dateStr + 'T23:59:59Z';
    
    const { count: msgSent } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('direction', 'outbound')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);
    
    const { count: msgReceived } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('direction', 'inbound')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);
    
    await supabase.from('daily_stats').insert({
      business_id: business.id,
      date: dateStr,
      messages_sent: msgSent || 0,
      messages_received: msgReceived || 0
    });
  }
}

// Helper to get timezone offset in hours
function getTimezoneOffset(timezone: string): number {
  const offsets: Record<string, number> = {
    'America/New_York': -5,
    'America/Chicago': -6,
    'America/Denver': -7,
    'America/Los_Angeles': -8,
    'America/Phoenix': -7,
    'Pacific/Honolulu': -10
  };
  return offsets[timezone] || -5;
}
