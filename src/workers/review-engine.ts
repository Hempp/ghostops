// ===========================================
// REVIEW ENGINE WORKER
// ORACLE Agent: Review Management
// ===========================================

import { CronJob } from 'cron';
import axios from 'axios';
import { supabase, saveReview, getRecentReviews } from '../lib/supabase.js';
import { sendSms } from '../lib/twilio.js';
import { generateReviewResponse } from '../lib/claude.js';
import type { Business, Review } from '../types/index.js';

// ===========================================
// WORKER INITIALIZATION
// ===========================================

export function startReviewEngineWorker(): void {
  // Check for new reviews every 30 minutes
  const fetchJob = new CronJob(
    '*/30 * * * *',
    async () => {
      await fetchNewReviews();
    },
    null,
    true,
    'UTC'
  );

  // Send review request texts daily at 2pm business time
  const requestJob = new CronJob(
    '* * * * *', // Check every minute for timezone-aware scheduling
    async () => {
      await processReviewRequests();
    },
    null,
    true,
    'UTC'
  );

  console.log('⭐ Review engine worker started');
}

// ===========================================
// GOOGLE BUSINESS INTEGRATION
// ===========================================

async function fetchNewReviews(): Promise<void> {
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .not('integrations->google_business_id', 'is', null);

    if (error) throw error;
    if (!businesses?.length) return;

    for (const business of businesses) {
      await fetchBusinessReviews(business as Business);
    }
  } catch (error) {
    console.error('Review fetch error:', error);
  }
}

async function fetchBusinessReviews(business: Business): Promise<void> {
  const googleBusinessId = business.integrations.google_business_id;
  if (!googleBusinessId) return;

  try {
    // Note: This would use Google My Business API
    // For now, this is a placeholder showing the structure
    const response = await axios.get(
      `https://mybusiness.googleapis.com/v4/accounts/${googleBusinessId}/locations/${googleBusinessId}/reviews`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`,
        },
      }
    );

    const reviews = response.data.reviews || [];

    for (const review of reviews) {
      // Check if we already have this review
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('external_id', review.reviewId)
        .single();

      if (existing) continue;

      // Save new review
      const savedReview = await saveReview(
        business.id,
        'google',
        review.reviewer.displayName,
        parseInt(review.starRating.replace('STAR_', '').replace('_', '.')),
        review.comment || '',
        review.reviewId
      );

      // Notify owner of new review
      await notifyNewReview(business, savedReview);

      // Generate and post response if enabled
      if (business.settings.review_requests_enabled) {
        await respondToReview(business, savedReview, review.reviewId);
      }
    }
  } catch (error) {
    console.error(`Failed to fetch reviews for ${business.name}:`, error);
  }
}

async function notifyNewReview(
  business: Business,
  review: Review
): Promise<void> {
  const stars = '⭐'.repeat(review.rating);
  const message =
    `New ${review.rating}-star review!\n\n` +
    `${stars}\n` +
    `"${review.content.substring(0, 100)}${review.content.length > 100 ? '...' : ''}"\n` +
    `- ${review.reviewer_name}`;

  await sendSms(business.owner_phone, business.twilio_number, message);
}

async function respondToReview(
  business: Business,
  review: Review,
  googleReviewId: string
): Promise<void> {
  try {
    // Generate AI response
    const response = await generateReviewResponse(
      business,
      review.reviewer_name,
      review.rating,
      review.content
    );

    // Post response to Google (placeholder - would use GMB API)
    // await axios.put(
    //   `https://mybusiness.googleapis.com/v4/.../reviews/${googleReviewId}/reply`,
    //   { comment: response },
    //   { headers: { Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}` } }
    // );

    // Update review with response
    await supabase
      .from('reviews')
      .update({
        response,
        responded_at: new Date().toISOString(),
      })
      .eq('id', review.id);

    console.log(`✅ Responded to review from ${review.reviewer_name}`);
  } catch (error) {
    console.error('Failed to respond to review:', error);
  }
}

// ===========================================
// REVIEW REQUEST SYSTEM
// ===========================================

async function processReviewRequests(): Promise<void> {
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*');

    if (error) throw error;
    if (!businesses?.length) return;

    const now = new Date();

    for (const business of businesses) {
      if (!business.settings.review_requests_enabled) continue;
      if (business.settings.paused) continue;

      // Check if it's 2pm in business timezone
      const businessNow = new Date(
        now.toLocaleString('en-US', { timeZone: business.timezone })
      );

      if (businessNow.getHours() === 14 && businessNow.getMinutes() === 0) {
        await sendReviewRequests(business as Business);
      }
    }
  } catch (error) {
    console.error('Review request processing error:', error);
  }
}

async function sendReviewRequests(business: Business): Promise<void> {
  // Get appointments/jobs completed yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', business.id)
    .eq('status', 'completed')
    .gte('scheduled_at', yesterday.toISOString())
    .lt('scheduled_at', today.toISOString());

  if (error || !appointments?.length) return;

  // Get Google review link (would be configured per business)
  const reviewLink = `https://search.google.com/local/writereview?placeid=${business.integrations.google_business_id}`;

  for (const appointment of appointments) {
    // Don't send if we already requested from this customer recently
    const { data: recentRequest } = await supabase
      .from('messages')
      .select('id')
      .eq('content', reviewLink)
      .eq('metadata->customer_phone', appointment.customer_phone)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (recentRequest) continue;

    const message =
      `Hi ${appointment.customer_name}! Thank you for choosing ${business.name} yesterday. ` +
      `We'd love to hear how we did! Could you take a moment to leave us a review?\n\n` +
      `${reviewLink}\n\n` +
      `Thank you! 🙏`;

    try {
      await sendSms(appointment.customer_phone, business.twilio_number, message);
      console.log(`📤 Review request sent to ${appointment.customer_name}`);
    } catch (error) {
      console.error(`Failed to send review request:`, error);
    }
  }
}

// ===========================================
// MANUAL TRIGGERS
// ===========================================

export async function requestReviewFromCustomer(
  businessId: string,
  customerPhone: string,
  customerName: string
): Promise<void> {
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (!business) return;

  const reviewLink = `https://search.google.com/local/writereview?placeid=${business.integrations.google_business_id}`;

  const message =
    `Hi ${customerName}! Thank you for choosing ${business.name}. ` +
    `We'd really appreciate if you could share your experience:\n\n` +
    `${reviewLink}\n\n` +
    `Thank you! 🙏`;

  await sendSms(customerPhone, business.twilio_number, message);
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  import('dotenv/config').then(() => {
    console.log('Running review engine worker standalone...');
    fetchNewReviews().then(() => {
      console.log('Done');
      process.exit(0);
    });
  });
}
