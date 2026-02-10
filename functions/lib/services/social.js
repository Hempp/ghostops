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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSocialPost = handleSocialPost;
exports.generateYouTubePackage = generateYouTubePackage;
exports.trackEngagement = trackEngagement;
exports.generateCommentReply = generateCommentReply;
exports.generateWeeklyContentPlan = generateWeeklyContentPlan;
exports.getBestPostingTime = getBestPostingTime;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const db = admin.firestore();
const anthropic = new sdk_1.default({
    apiKey: functions.config().anthropic?.api_key,
});
// Platform-specific constraints (used in generateMultiPlatformPosts system prompt)
const _PLATFORM_SPECS = {
    instagram: { maxLength: 2200, hashtagLimit: 30 },
    facebook: { maxLength: 63206, hashtagLimit: 5 },
    linkedin: { maxLength: 3000, hashtagLimit: 5 },
    tiktok: { maxLength: 2200, hashtagLimit: 8 },
    youtube: { titleMax: 100, descriptionMax: 5000 },
};
void _PLATFORM_SPECS; // Reference to avoid unused warning
async function handleSocialPost(businessId, message, mediaUrls, intent) {
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    const business = businessDoc.data();
    // Detect if this is a video (for TikTok/YouTube/Reels)
    const hasVideo = mediaUrls.some((url) => /\.(mp4|mov|avi|webm)$/i.test(url) || url.includes('video'));
    // Determine target platforms
    const platforms = detectTargetPlatforms(message, hasVideo);
    if (mediaUrls.length === 0 && !message.includes('post')) {
        return {
            reply: "Send me a photo or video and I'll create posts for your social media!",
            intent,
        };
    }
    // Generate platform-specific content
    const posts = await generateMultiPlatformPosts(business, message, mediaUrls, platforms, hasVideo);
    // If scheduling requested
    if (intent === 'social_schedule' || message.toLowerCase().includes('schedule')) {
        return handleScheduling(businessId, posts, message);
    }
    // Present options to owner
    const postPreviews = posts
        .map((p) => `📱 ${p.platform.toUpperCase()}:\n"${p.content.substring(0, 100)}..."`)
        .join('\n\n');
    // Store draft posts
    const draftRef = await db.collection('social_drafts').add({
        business_id: businessId,
        posts,
        media_urls: mediaUrls,
        status: 'pending_approval',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        reply: `Got it! Here's what I'd post:\n\n${postPreviews}\n\n` +
            `Reply:\n` +
            `• "post now" to publish immediately\n` +
            `• "schedule tomorrow 10am" to schedule\n` +
            `• "change [platform]..." to edit`,
        intent,
        actions: [{ type: 'social_draft_created', draft_id: draftRef.id }],
    };
}
function detectTargetPlatforms(message, hasVideo) {
    const lower = message.toLowerCase();
    const platforms = [];
    if (lower.includes('instagram') || lower.includes('ig'))
        platforms.push('instagram');
    if (lower.includes('facebook') || lower.includes('fb'))
        platforms.push('facebook');
    if (lower.includes('linkedin'))
        platforms.push('linkedin');
    if (lower.includes('tiktok') || lower.includes('tik tok'))
        platforms.push('tiktok');
    if (lower.includes('youtube') || lower.includes('yt'))
        platforms.push('youtube');
    // Default platforms if none specified
    if (platforms.length === 0) {
        if (hasVideo) {
            platforms.push('instagram', 'tiktok', 'facebook');
        }
        else {
            platforms.push('instagram', 'facebook');
        }
    }
    return platforms;
}
async function generateMultiPlatformPosts(business, message, mediaUrls, platforms, hasVideo) {
    const businessContext = `
Business: ${business?.name || 'Service Business'}
Industry: ${business?.industry || 'home services'}
Brand voice: ${business?.brand_voice || 'friendly, professional, local'}
Location: ${business?.location || 'local area'}
`;
    const mediaContext = hasVideo
        ? 'The owner sent a VIDEO. Generate content suitable for video posts (Reels, TikTok, etc.)'
        : `The owner sent ${mediaUrls.length} PHOTO(s). Generate content for image posts.`;
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `You are an expert social media manager. Generate platform-specific posts.

${businessContext}
${mediaContext}

Owner's message/context: "${message}"

For each platform, consider:
- Character limits and optimal length
- Platform-specific hashtag usage
- Tone and style expectations
- Call-to-action best practices
- Hook/opening line importance

Respond as JSON array:
[{"platform": "instagram", "content": "...", "hashtags": ["...", "..."], "format": "reel|post|story"}]`,
        messages: [
            {
                role: 'user',
                content: `Generate posts for these platforms: ${platforms.join(', ')}`,
            },
        ],
    });
    try {
        return JSON.parse(response.content[0].text);
    }
    catch {
        // Fallback: generate simple posts
        return platforms.map((platform) => ({
            platform,
            content: `Check out our latest work! ${business?.name || ''}`,
            hashtags: ['#' + (business?.industry || 'business').replace(/\s/g, '')],
        }));
    }
}
async function generateYouTubePackage(businessId, videoDescription, duration) {
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    const business = businessDoc.data();
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: `You are a YouTube SEO expert. Generate a complete YouTube package.

Business: ${business?.name}
Industry: ${business?.industry || 'home services'}

Generate:
1. SEO-optimized title (under 100 chars, include keywords)
2. Full description with:
   - Hook in first 2 lines
   - Detailed content summary
   - Timestamps (if duration provided)
   - Links section placeholder
   - Call to action
3. Relevant tags (comma-separated)
4. Thumbnail text suggestion

Respond as JSON:
{
  "title": "...",
  "description": "...",
  "tags": ["...", "..."],
  "timestamps": ["0:00 Intro", "1:30 Main content", ...],
  "thumbnailSuggestion": "text overlay idea"
}`,
        messages: [
            {
                role: 'user',
                content: `Video content: ${videoDescription}${duration ? ` (${duration} seconds)` : ''}`,
            },
        ],
    });
    return JSON.parse(response.content[0].text);
}
async function handleScheduling(businessId, posts, message) {
    // Parse scheduling time from message
    const scheduleTime = parseScheduleTime(message);
    if (!scheduleTime) {
        return {
            reply: "When should I post? Try 'tomorrow 10am' or 'Monday 2pm'",
            intent: 'social_schedule',
        };
    }
    // Store scheduled posts
    for (const post of posts) {
        await db.collection('scheduled_posts').add({
            business_id: businessId,
            platform: post.platform,
            content: post.content,
            hashtags: post.hashtags,
            scheduled_for: scheduleTime,
            status: 'scheduled',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    const timeStr = scheduleTime.toLocaleString('en', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
    return {
        reply: `Scheduled! Your posts will go live ${timeStr} on ${posts.map((p) => p.platform).join(', ')}. ✅`,
        intent: 'social_schedule',
    };
}
function parseScheduleTime(message) {
    const now = new Date();
    const lower = message.toLowerCase();
    if (lower.includes('tomorrow')) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2] || '0');
            const period = timeMatch[3]?.toLowerCase();
            if (period === 'pm' && hour < 12)
                hour += 12;
            if (period === 'am' && hour === 12)
                hour = 0;
            tomorrow.setHours(hour, minute, 0, 0);
        }
        else {
            tomorrow.setHours(10, 0, 0, 0); // Default 10am
        }
        return tomorrow;
    }
    // Handle day names
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
        if (lower.includes(days[i])) {
            const target = new Date(now);
            const currentDay = now.getDay();
            const daysUntil = (i - currentDay + 7) % 7 || 7;
            target.setDate(target.getDate() + daysUntil);
            const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
            if (timeMatch) {
                let hour = parseInt(timeMatch[1]);
                const minute = parseInt(timeMatch[2] || '0');
                const period = timeMatch[3]?.toLowerCase();
                if (period === 'pm' && hour < 12)
                    hour += 12;
                if (period === 'am' && hour === 12)
                    hour = 0;
                target.setHours(hour, minute, 0, 0);
            }
            else {
                target.setHours(10, 0, 0, 0);
            }
            return target;
        }
    }
    return null;
}
// ============================================
// ENGAGEMENT TRACKING
// ============================================
async function trackEngagement(businessId, postId, platform) {
    // This would be called by a scheduled function polling platform APIs
    // Store engagement data
    const engagementRef = db.collection('post_engagement').doc(postId);
    // Platform API polling would happen here
    // For now, store structure
    await engagementRef.set({
        business_id: businessId,
        platform,
        last_checked: admin.firestore.FieldValue.serverTimestamp(),
        // These would come from actual API calls:
        // likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0
    }, { merge: true });
}
// ============================================
// AUTO-REPLY TO COMMENTS
// ============================================
async function generateCommentReply(businessId, comment, platform) {
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    const business = businessDoc.data();
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `You are responding to a social media comment for ${business?.name || 'this business'}.
Brand voice: ${business?.brand_voice || 'friendly, professional'}
Platform: ${platform}

Write a brief, authentic reply. Be:
- Grateful and warm
- On-brand
- Encouraging engagement
- Under 100 characters ideally

Don't be generic. Reference the comment content.`,
        messages: [{ role: 'user', content: `Comment: "${comment}"` }],
    });
    return response.content[0].text;
}
// ============================================
// AUTONOMOUS CONTENT GENERATION
// ============================================
async function generateWeeklyContentPlan(businessId) {
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    const business = businessDoc.data();
    // Get recent completed jobs
    const jobsSnap = await db
        .collection('appointments')
        .where('business_id', '==', businessId)
        .where('status', '==', 'completed')
        .orderBy('completed_at', 'desc')
        .limit(5)
        .get();
    const recentJobs = jobsSnap.docs.map((d) => d.data());
    // Get recent reviews
    const reviewsSnap = await db
        .collection('reviews')
        .where('business_id', '==', businessId)
        .orderBy('created_at', 'desc')
        .limit(5)
        .get();
    const recentReviews = reviewsSnap.docs.map((d) => d.data());
    // Get stored photos
    const mediaSnap = await db
        .collection('media')
        .where('business_id', '==', businessId)
        .where('used_in_post', '==', false)
        .limit(10)
        .get();
    const availableMedia = mediaSnap.docs.map((d) => d.data());
    // Generate content plan
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: `You are a social media strategist creating a weekly content plan.

Business: ${business?.name}
Industry: ${business?.industry || 'home services'}

Recent completed jobs: ${JSON.stringify(recentJobs.map((j) => j.description))}
Recent reviews: ${recentReviews.map((r) => `${r.rating}★: "${r.text?.substring(0, 50)}..."`).join(', ')}
Available photos: ${availableMedia.length}

Create a 7-day content plan with:
- Mix of content types (before/after, tips, testimonials, behind-scenes)
- Optimal posting times for engagement
- Platform recommendations
- Specific post ideas

Respond as a friendly text message summarizing the plan and asking for approval.`,
        messages: [{ role: 'user', content: 'Generate this week\'s content plan' }],
    });
    return response.content[0].text;
}
// ============================================
// BEST TIME LEARNING
// ============================================
async function getBestPostingTime(businessId, platform) {
    // Analyze historical engagement data
    const engagementSnap = await db
        .collection('post_engagement')
        .where('business_id', '==', businessId)
        .where('platform', '==', platform)
        .orderBy('engagement_rate', 'desc')
        .limit(20)
        .get();
    if (engagementSnap.empty) {
        // Return industry defaults
        const defaults = {
            instagram: { day: 'wednesday', hour: 11 },
            facebook: { day: 'thursday', hour: 13 },
            linkedin: { day: 'tuesday', hour: 10 },
            tiktok: { day: 'tuesday', hour: 19 },
        };
        return defaults[platform] || { day: 'wednesday', hour: 10 };
    }
    // Analyze patterns
    const hourCounts = {};
    const dayCounts = {};
    engagementSnap.docs.forEach((doc) => {
        const data = doc.data();
        const posted = data.posted_at?.toDate();
        if (posted) {
            const hour = posted.getHours();
            const day = posted.toLocaleDateString('en', { weekday: 'lowercase' });
            hourCounts[hour] = (hourCounts[hour] || 0) + (data.engagement_rate || 0);
            dayCounts[day] = (dayCounts[day] || 0) + (data.engagement_rate || 0);
        }
    });
    const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
        day: bestDay || 'wednesday',
        hour: bestHour ? parseInt(bestHour) : 10,
    };
}
//# sourceMappingURL=social.js.map