"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollEngagement = exports.weeklyContentPlan = exports.scheduledPosts = exports.invoiceReminders = exports.morningBriefing = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const twilio_1 = require("twilio");
const social_1 = require("../services/social");
const db = admin.firestore();
const twilio = new twilio_1.Twilio(functions.config().twilio?.account_sid, functions.config().twilio?.auth_token);
// ============================================
// MORNING BRIEFING - Runs daily at 7 AM
// ============================================
exports.morningBriefing = functions.pubsub
    .schedule('0 7 * * *')
    .timeZone('America/New_York')
    .onRun(async () => {
    // Get all active businesses with briefings enabled
    const businessesSnap = await db
        .collection('businesses')
        .where('onboarding_complete', '==', true)
        .where('morning_briefing_enabled', '!=', false)
        .get();
    for (const businessDoc of businessesSnap.docs) {
        const business = businessDoc.data();
        const businessId = businessDoc.id;
        try {
            const briefing = await generateMorningBriefing(businessId, business);
            await twilio.messages.create({
                body: briefing,
                from: business.twilio_number,
                to: business.owner_phone,
            });
            console.log(`Sent morning briefing to ${business.name}`);
        }
        catch (error) {
            console.error(`Failed to send briefing to ${business.name}:`, error);
        }
    }
});
async function generateMorningBriefing(businessId, business) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    // Get yesterday's stats
    const statsDoc = await db.collection('daily_stats').doc(`${businessId}_${yesterdayStr}`).get();
    const stats = statsDoc.data() || {};
    // Get today's appointments (if Google connected)
    let appointments = [];
    if (business.google_connected) {
        // Would call Google Calendar API here
        // For now, get from Firestore appointments
        const apptSnap = await db
            .collection('appointments')
            .where('business_id', '==', businessId)
            .where('date', '==', todayStr)
            .orderBy('time')
            .get();
        appointments = apptSnap.docs.map((d) => d.data());
    }
    // Get unpaid invoices
    const unpaidSnap = await db
        .collection('invoices')
        .where('business_id', '==', businessId)
        .where('status', 'in', ['sent', 'viewed', 'overdue'])
        .get();
    const unpaidTotal = unpaidSnap.docs.reduce((sum, d) => sum + (d.data().amount_cents || 0), 0);
    const overdueCount = unpaidSnap.docs.filter((d) => d.data().status === 'overdue').length;
    // Get new reviews
    const reviewsSnap = await db
        .collection('reviews')
        .where('business_id', '==', businessId)
        .where('created_at', '>=', yesterday)
        .get();
    const newReviews = reviewsSnap.docs.map((d) => d.data());
    // Get social media engagement from yesterday's posts
    const engagementSnap = await db
        .collection('post_engagement')
        .where('business_id', '==', businessId)
        .where('last_checked', '>=', yesterday)
        .get();
    const totalEngagement = engagementSnap.docs.reduce((sum, d) => {
        const data = d.data();
        return sum + (data.likes || 0) + (data.comments || 0) + (data.shares || 0);
    }, 0);
    const totalReach = engagementSnap.docs.reduce((sum, d) => sum + (d.data().reach || 0), 0);
    // Format the briefing
    const dayName = today.toLocaleDateString('en', { weekday: 'long' });
    let briefing = `☀️ Good morning! Here's your ${dayName} briefing:\n\n`;
    // Appointments
    if (appointments.length > 0) {
        briefing += `📅 TODAY (${appointments.length}):\n`;
        appointments.slice(0, 5).forEach((apt) => {
            briefing += `• ${apt.time} - ${apt.title}\n`;
        });
        if (appointments.length > 5) {
            briefing += `  +${appointments.length - 5} more\n`;
        }
        briefing += '\n';
    }
    else {
        briefing += '📅 No appointments today\n\n';
    }
    // Yesterday's highlights
    if (stats.revenue_cents) {
        briefing += `💰 Yesterday: $${(stats.revenue_cents / 100).toLocaleString()} collected\n`;
    }
    if (stats.new_leads) {
        briefing += `🎯 ${stats.new_leads} new lead${stats.new_leads > 1 ? 's' : ''}\n`;
    }
    if (stats.missed_calls) {
        briefing += `📞 ${stats.missed_calls} missed call${stats.missed_calls > 1 ? 's' : ''} recovered\n`;
    }
    // Unpaid invoices
    if (unpaidSnap.size > 0) {
        briefing += `\n📋 Unpaid: ${unpaidSnap.size} invoices ($${(unpaidTotal / 100).toLocaleString()})`;
        if (overdueCount > 0) {
            briefing += ` ⚠️ ${overdueCount} overdue`;
        }
        briefing += '\n';
    }
    // Reviews
    if (newReviews.length > 0) {
        const avgRating = newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length;
        briefing += `\n⭐ ${newReviews.length} new review${newReviews.length > 1 ? 's' : ''} (avg ${avgRating.toFixed(1)}★)\n`;
    }
    // Social media
    if (totalEngagement > 0 || totalReach > 0) {
        briefing += `\n📱 Social: ${totalReach > 1000 ? (totalReach / 1000).toFixed(1) + 'K' : totalReach} reach, ${totalEngagement} engagements\n`;
    }
    briefing += `\nText me anytime. Have a great ${dayName}! 👻`;
    return briefing;
}
// ============================================
// INVOICE REMINDERS - Runs daily at 10 AM
// ============================================
exports.invoiceReminders = functions.pubsub
    .schedule('0 10 * * *')
    .timeZone('America/New_York')
    .onRun(async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    // Get invoices that need reminders
    const invoicesSnap = await db
        .collection('invoices')
        .where('status', 'in', ['sent', 'viewed'])
        .where('last_reminder_at', '<', threeDaysAgo)
        .get();
    for (const invoiceDoc of invoicesSnap.docs) {
        const invoice = invoiceDoc.data();
        const businessDoc = await db.collection('businesses').doc(invoice.business_id).get();
        const business = businessDoc.data();
        if (!business)
            continue;
        // Determine reminder urgency
        const sentAt = invoice.sent_at?.toDate() || new Date();
        const daysSinceSent = Math.floor((Date.now() - sentAt.getTime()) / (1000 * 60 * 60 * 24));
        let reminderMessage;
        if (daysSinceSent > 7) {
            // Urgent reminder
            reminderMessage =
                `Hi ${invoice.contact_name}, this is a friendly reminder about your invoice ` +
                    `for $${(invoice.amount_cents / 100).toFixed(2)} from ${business.name}.\n\n` +
                    `It's now ${daysSinceSent} days overdue. Please pay at your earliest convenience:\n` +
                    `${invoice.stripe_payment_link}\n\n` +
                    `Questions? Just reply to this text.`;
            // Mark as overdue
            await invoiceDoc.ref.update({ status: 'overdue' });
        }
        else {
            // Gentle reminder
            reminderMessage =
                `Hi ${invoice.contact_name}! Quick reminder about your invoice ` +
                    `for $${(invoice.amount_cents / 100).toFixed(2)} from ${business.name}.\n\n` +
                    `Pay here: ${invoice.stripe_payment_link}\n\n` +
                    `Thanks! 🙏`;
        }
        try {
            await twilio.messages.create({
                body: reminderMessage,
                from: business.twilio_number,
                to: invoice.contact_phone,
            });
            await invoiceDoc.ref.update({
                last_reminder_at: admin.firestore.FieldValue.serverTimestamp(),
                reminder_count: admin.firestore.FieldValue.increment(1),
            });
            console.log(`Sent reminder for invoice ${invoiceDoc.id}`);
        }
        catch (error) {
            console.error(`Failed to send reminder for ${invoiceDoc.id}:`, error);
        }
    }
});
// ============================================
// SCHEDULED POSTS - Runs every 15 minutes
// ============================================
exports.scheduledPosts = functions.pubsub
    .schedule('*/15 * * * *')
    .onRun(async () => {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    // Get posts scheduled for the next 15 minutes
    const postsSnap = await db
        .collection('scheduled_posts')
        .where('status', '==', 'scheduled')
        .where('scheduled_for', '<=', fifteenMinutesFromNow)
        .where('scheduled_for', '>', now)
        .get();
    for (const postDoc of postsSnap.docs) {
        const post = postDoc.data();
        try {
            // Publish to platform (would call actual APIs)
            await publishPost(post);
            await postDoc.ref.update({
                status: 'posted',
                posted_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Notify owner
            const businessDoc = await db.collection('businesses').doc(post.business_id).get();
            const business = businessDoc.data();
            if (business?.owner_phone) {
                await twilio.messages.create({
                    body: `📱 Your ${post.platform} post just went live! ✅`,
                    from: business.twilio_number,
                    to: business.owner_phone,
                });
            }
            console.log(`Published scheduled post ${postDoc.id} to ${post.platform}`);
        }
        catch (error) {
            console.error(`Failed to publish post ${postDoc.id}:`, error);
            await postDoc.ref.update({ status: 'failed', error: String(error) });
        }
    }
});
async function publishPost(post) {
    // This would integrate with actual social media APIs
    // Meta Graph API for Instagram/Facebook
    // LinkedIn API
    // TikTok API
    // YouTube Data API
    // For now, log the publish
    console.log(`Publishing to ${post.platform}: ${post.content.substring(0, 50)}...`);
    // Create engagement tracking record
    await db.collection('post_engagement').add({
        business_id: post.business_id,
        platform: post.platform,
        posted_at: admin.firestore.FieldValue.serverTimestamp(),
        content_preview: post.content.substring(0, 100),
        status: 'tracking',
    });
}
// ============================================
// WEEKLY CONTENT PLANNING - Runs Sunday 6 PM
// ============================================
exports.weeklyContentPlan = functions.pubsub
    .schedule('0 18 * * 0')
    .timeZone('America/New_York')
    .onRun(async () => {
    const businessesSnap = await db
        .collection('businesses')
        .where('onboarding_complete', '==', true)
        .where('social_auto_plan', '==', true)
        .get();
    for (const businessDoc of businessesSnap.docs) {
        const business = businessDoc.data();
        const businessId = businessDoc.id;
        try {
            const contentPlan = await (0, social_1.generateWeeklyContentPlan)(businessId);
            await twilio.messages.create({
                body: contentPlan,
                from: business.twilio_number,
                to: business.owner_phone,
            });
            console.log(`Sent content plan to ${business.name}`);
        }
        catch (error) {
            console.error(`Failed to generate content plan for ${business.name}:`, error);
        }
    }
});
// ============================================
// ENGAGEMENT POLLING - Runs every 6 hours
// ============================================
exports.pollEngagement = functions.pubsub
    .schedule('0 */6 * * *')
    .onRun(async () => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    // Get posts from the last 24 hours that need engagement checks
    const postsSnap = await db
        .collection('post_engagement')
        .where('posted_at', '>=', twentyFourHoursAgo)
        .where('status', '==', 'tracking')
        .get();
    for (const postDoc of postsSnap.docs) {
        // Would call actual platform APIs to get engagement metrics
        // For now, simulate the structure
        const engagement = {
            likes: 0, // from API
            comments: 0, // from API
            shares: 0, // from API
            reach: 0, // from API
            impressions: 0, // from API
        };
        await postDoc.ref.update({
            ...engagement,
            last_checked: admin.firestore.FieldValue.serverTimestamp(),
            engagement_rate: calculateEngagementRate(engagement),
        });
    }
});
function calculateEngagementRate(engagement) {
    if (!engagement.reach || engagement.reach === 0)
        return 0;
    const totalEngagements = (engagement.likes || 0) + (engagement.comments || 0) + (engagement.shares || 0);
    return (totalEngagements / engagement.reach) * 100;
}
//# sourceMappingURL=scheduled.js.map