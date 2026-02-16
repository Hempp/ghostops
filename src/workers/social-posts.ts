// ===========================================
// SOCIAL POST WORKER
// PRISM Agent: Scheduled Publishing
// ===========================================

import { CronJob } from 'cron';
import { supabase, updateSocialPost } from '../lib/supabase.js';
import { sendSms } from '../lib/twilio.js';
import {
  postToInstagram,
  postToFacebook,
  postCarouselToInstagram,
  postMultiplePhotosToFacebook,
  getPostEngagement,
} from '../lib/meta.js';
import type { Business, SocialPost, SocialPlatform } from '../types/index.js';

// ===========================================
// WORKER INITIALIZATION
// ===========================================

export function startSocialPostWorker(): void {
  // Check for scheduled posts every minute
  const publishJob = new CronJob(
    '* * * * *',
    async () => {
      await processScheduledPosts();
    },
    null,
    true,
    'UTC'
  );

  // Update engagement metrics every 15 minutes
  const engagementJob = new CronJob(
    '*/15 * * * *',
    async () => {
      await updateEngagementMetrics();
    },
    null,
    true,
    'UTC'
  );

  console.log('📱 Social post worker started');
}

// ===========================================
// SCHEDULED POST PUBLISHING
// ===========================================

async function processScheduledPosts(): Promise<void> {
  try {
    const now = new Date();

    // Get posts scheduled for now or earlier
    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('*, businesses(*)')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString());

    if (error) throw error;
    if (!posts?.length) return;

    for (const post of posts) {
      const business = post.businesses as Business;
      if (!business) continue;

      await publishPost(post as SocialPost, business);
    }
  } catch (error) {
    console.error('Social post worker error:', error);
  }
}

async function publishPost(
  post: SocialPost,
  business: Business
): Promise<void> {
  console.log(`📤 Publishing post ${post.id} for ${business.name}`);

  const postIds: Record<SocialPlatform, string> = { instagram: '', facebook: '' };
  const errors: string[] = [];

  const accessToken = business.integrations.meta_access_token;
  if (!accessToken) {
    await updateSocialPost(post.id, { status: 'failed' });
    await notifyOwner(
      business,
      '❌ Post failed: Meta account not connected. Connect in dashboard.'
    );
    return;
  }

  const caption = post.ai_options[post.selected_option || 0] || post.content || '';
  const mediaUrls = post.media_urls;

  // Publish to Instagram
  if (
    post.platforms.includes('instagram') &&
    business.integrations.meta_instagram_id
  ) {
    try {
      if (mediaUrls.length === 1) {
        postIds.instagram = await postToInstagram(
          accessToken,
          business.integrations.meta_instagram_id,
          mediaUrls[0],
          caption
        );
      } else if (mediaUrls.length > 1) {
        postIds.instagram = await postCarouselToInstagram(
          accessToken,
          business.integrations.meta_instagram_id,
          mediaUrls,
          caption
        );
      }
      console.log(`✅ Posted to Instagram: ${postIds.instagram}`);
    } catch (error) {
      console.error('Instagram post error:', error);
      errors.push('Instagram');
    }
  }

  // Publish to Facebook
  if (
    post.platforms.includes('facebook') &&
    business.integrations.meta_page_id
  ) {
    try {
      if (mediaUrls.length === 1) {
        postIds.facebook = await postToFacebook(
          accessToken,
          business.integrations.meta_page_id,
          caption,
          mediaUrls[0]
        );
      } else if (mediaUrls.length > 1) {
        postIds.facebook = await postMultiplePhotosToFacebook(
          accessToken,
          business.integrations.meta_page_id,
          caption,
          mediaUrls
        );
      } else {
        postIds.facebook = await postToFacebook(
          accessToken,
          business.integrations.meta_page_id,
          caption
        );
      }
      console.log(`✅ Posted to Facebook: ${postIds.facebook}`);
    } catch (error) {
      console.error('Facebook post error:', error);
      errors.push('Facebook');
    }
  }

  // Update post status
  if (errors.length === post.platforms.length) {
    // All platforms failed
    await updateSocialPost(post.id, { status: 'failed' });
    await notifyOwner(
      business,
      `❌ Post failed on all platforms. Please check your account connections.`
    );
  } else {
    // At least one platform succeeded
    await updateSocialPost(post.id, {
      status: 'posted',
      posted_at: new Date().toISOString(),
      post_ids: postIds,
    });

    const successPlatforms = post.platforms.filter(p => !errors.includes(p === 'instagram' ? 'Instagram' : 'Facebook'));
    await notifyOwner(
      business,
      `✅ Posted to ${successPlatforms.join(' & ')}!${errors.length ? ` (Failed: ${errors.join(', ')})` : ''}`
    );
  }
}

// ===========================================
// ENGAGEMENT TRACKING
// ===========================================

async function updateEngagementMetrics(): Promise<void> {
  try {
    // Get posts from last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('*, businesses(*)')
      .eq('status', 'posted')
      .gte('posted_at', weekAgo.toISOString());

    if (error) throw error;
    if (!posts?.length) return;

    for (const post of posts) {
      const business = post.businesses as Business;
      if (!business?.integrations.meta_access_token) continue;

      const engagement = {
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
      };

      const postIds = post.post_ids as Record<SocialPlatform, string>;

      // Get Instagram engagement
      if (postIds.instagram && business.integrations?.meta_access_token) {
        try {
          const igEngagement = await getPostEngagement(
            business.integrations.meta_access_token,
            postIds.instagram,
            'instagram'
          );
          engagement.likes += igEngagement.likes || 0;
          engagement.comments += igEngagement.comments || 0;
          engagement.reach = (engagement.reach || 0) + (igEngagement.reach || 0);
        } catch {
          // Post might have been deleted or token expired
        }
      }

      // Get Facebook engagement
      if (postIds.facebook && business.integrations?.meta_access_token) {
        try {
          const fbEngagement = await getPostEngagement(
            business.integrations.meta_access_token,
            postIds.facebook,
            'facebook'
          );
          engagement.likes += fbEngagement.likes || 0;
          engagement.comments += fbEngagement.comments || 0;
          engagement.shares = (engagement.shares || 0) + (fbEngagement.shares || 0);
        } catch {
          // Post might have been deleted or token expired
        }
      }

      // Update engagement in database
      await updateSocialPost(post.id, { engagement });
    }
  } catch (error) {
    console.error('Engagement update error:', error);
  }
}

// ===========================================
// HELPERS
// ===========================================

async function notifyOwner(business: Business, message: string): Promise<void> {
  try {
    if (!business.twilio_number) return;
    await sendSms(business.owner_phone, business.twilio_number, message);
  } catch (error) {
    console.error('Failed to notify owner:', error);
  }
}

// ===========================================
// MANUAL TRIGGERS
// ===========================================

export async function publishPostNow(postId: string): Promise<void> {
  const { data: post } = await supabase
    .from('social_posts')
    .select('*, businesses(*)')
    .eq('id', postId)
    .single();

  if (post) {
    const business = post.businesses as Business;
    await publishPost(post as SocialPost, business);
  }
}

export async function schedulePost(
  postId: string,
  scheduledFor: Date,
  selectedCaption: string,
  platforms: SocialPlatform[]
): Promise<void> {
  await updateSocialPost(postId, {
    status: 'scheduled',
    scheduled_for: scheduledFor.toISOString(),
    selected_caption: selectedCaption,
    platforms,
  });
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  import('dotenv/config').then(() => {
    console.log('Running social post worker standalone...');
    processScheduledPosts().then(() => {
      console.log('Done');
      process.exit(0);
    });
  });
}
