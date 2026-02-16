// ===========================================
// MORNING BRIEFING WORKER
// ORACLE Agent: Daily Intelligence
// ===========================================

import { CronJob } from 'cron';
import {
  getAllBusinesses,
  getBusinessMetrics,
  saveDailyBriefing,
} from '../lib/supabase.js';
import { sendSms } from '../lib/twilio.js';
import { generateBriefingMessage } from '../lib/claude.js';
import type { Business, BriefingMetrics } from '../types/index.js';

// ===========================================
// WORKER INITIALIZATION
// ===========================================

export function startMorningBriefingWorker(): void {
  // Run every minute to check for businesses with briefings due
  const job = new CronJob(
    '* * * * *', // Every minute
    async () => {
      await processScheduledBriefings();
    },
    null,
    true,
    'UTC'
  );

  console.log('⏰ Morning briefing worker started');
}

// ===========================================
// BRIEFING LOGIC
// ===========================================

async function processScheduledBriefings(): Promise<void> {
  try {
    const businesses = await getAllBusinesses();
    const now = new Date();

    for (const business of businesses) {
      if (!business.settings.morning_briefing_enabled) continue;
      if (business.settings.paused) continue;

      // Check if it's time for this business's briefing
      const briefingTime = business.settings.morning_briefing_time || '08:00';
      const [targetHour, targetMinute] = briefingTime.split(':').map(Number);

      // Get current time in business timezone
      const businessNow = new Date(
        now.toLocaleString('en-US', { timeZone: business.timezone })
      );
      const currentHour = businessNow.getHours();
      const currentMinute = businessNow.getMinutes();

      // Check if we're within the target minute
      if (currentHour === targetHour && currentMinute === targetMinute) {
        // Check if we already sent today
        const today = now.toISOString().split('T')[0];
        const alreadySent = await checkBriefingSent(business.id, today);

        if (!alreadySent) {
          await sendMorningBriefing(business);
        }
      }
    }
  } catch (error) {
    console.error('Morning briefing worker error:', error);
  }
}

async function checkBriefingSent(
  businessId: string,
  date: string
): Promise<boolean> {
  const { supabase } = await import('../lib/supabase.js');
  const { data } = await supabase
    .from('daily_briefings')
    .select('id')
    .eq('business_id', businessId)
    .eq('date', date)
    .single();

  return !!data;
}

async function sendMorningBriefing(business: Business): Promise<void> {
  console.log(`📊 Sending morning briefing to ${business.name}`);

  try {
    // Get metrics
    const metrics = await getBusinessMetrics(business.id);

    // Get additional context
    const { supabase } = await import('../lib/supabase.js');

    // Get today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('business_id', business.id)
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())
      .eq('status', 'scheduled');

    // Get social post stats from yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: posts } = await supabase
      .from('social_posts')
      .select('engagement')
      .eq('business_id', business.id)
      .eq('status', 'posted')
      .gte('posted_at', yesterday.toISOString())
      .lt('posted_at', today.toISOString());

    const totalEngagement = (posts || []).reduce((sum, post) => {
      const eng = post.engagement as { likes: number; comments: number; shares: number };
      return sum + (eng.likes || 0) + (eng.comments || 0) + (eng.shares || 0);
    }, 0);

    // Build full metrics
    const fullMetrics: BriefingMetrics = {
      new_leads: metrics.newLeads,
      new_reviews: metrics.newReviews,
      average_rating: metrics.avgRating,
      revenue_today: metrics.revenueToday,
      revenue_week: metrics.revenueWeek,
      unpaid_invoices: metrics.unpaidInvoices,
      unpaid_amount: metrics.unpaidAmount,
      posts_published: posts?.length || 0,
      total_engagement: totalEngagement,
      appointments_today: appointments?.length || 0,
    };

    // Generate briefing message
    const message = await generateBriefingMessage(business, {
      newLeads: fullMetrics.new_leads,
      newReviews: fullMetrics.new_reviews,
      avgRating: fullMetrics.average_rating,
      revenueToday: fullMetrics.revenue_today,
      revenueWeek: fullMetrics.revenue_week,
      unpaidInvoices: fullMetrics.unpaid_invoices,
      unpaidAmount: fullMetrics.unpaid_amount,
      appointmentsToday: fullMetrics.appointments_today,
    });

    // Send SMS
    if (!business.twilio_number) {
      throw new Error('Business has no Twilio number');
    }
    await sendSms(
      business.owner_phone,
      business.twilio_number,
      `☀️ Good morning, ${business.owner_name}!\n\n${message}`
    );

    // Save briefing record
    await saveDailyBriefing(business.id, fullMetrics);

    console.log(`✅ Morning briefing sent to ${business.owner_name}`);
  } catch (error) {
    console.error(`Failed to send briefing to ${business.name}:`, error);
  }
}

// ===========================================
// MANUAL TRIGGER (for testing)
// ===========================================

export async function triggerBriefingForBusiness(
  businessId: string
): Promise<void> {
  const { supabase } = await import('../lib/supabase.js');
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (business) {
    await sendMorningBriefing(business as Business);
  }
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  import('dotenv/config').then(() => {
    console.log('Running morning briefing worker standalone...');
    processScheduledBriefings().then(() => {
      console.log('Done');
      process.exit(0);
    });
  });
}
