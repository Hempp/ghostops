// Meta Graph API Service - Social Media Engine
import type { Business, SocialPost } from '../../types/index.js';
import { supabase } from '../supabase.js';

const META_API_VERSION = 'v18.0';
const META_BASE_URL = 'https://graph.facebook.com';

interface MediaUploadResponse {
  id: string;
  uri?: string;
}

interface PostResponse {
  id: string;
}

// Post to Facebook Page
export async function postToFacebook(
  business: Business,
  content: string,
  mediaUrls?: string[]
): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!business.meta_page_id || !business.meta_access_token) {
    return { success: false, error: 'Facebook not connected' };
  }

  try {
    let endpoint = META_BASE_URL + '/' + META_API_VERSION + '/' + business.meta_page_id;
    let body: Record<string, string>;

    if (mediaUrls && mediaUrls.length > 0) {
      // Post with photo
      endpoint += '/photos';
      body = {
        url: mediaUrls[0],
        caption: content,
        access_token: business.meta_access_token
      };
    } else {
      // Text-only post
      endpoint += '/feed';
      body = {
        message: content,
        access_token: business.meta_access_token
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json() as PostResponse;
    
    if (data.id) {
      return { success: true, postId: data.id };
    }
    
    return { success: false, error: 'Failed to post' };
  } catch (error) {
    console.error('Facebook post error:', error);
    return { success: false, error: String(error) };
  }
}

// Post to Instagram (requires Business/Creator account)
export async function postToInstagram(
  business: Business,
  content: string,
  mediaUrls: string[]
): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!business.instagram_account_id || !business.meta_access_token) {
    return { success: false, error: 'Instagram not connected' };
  }

  if (!mediaUrls || mediaUrls.length === 0) {
    return { success: false, error: 'Instagram requires media' };
  }

  try {
    // Step 1: Create media container
    const containerEndpoint = META_BASE_URL + '/' + META_API_VERSION + '/' + business.instagram_account_id + '/media';
    
    const isVideo = mediaUrls[0].match(/\.(mp4|mov|avi)$/i);
    const containerBody: Record<string, string> = {
      caption: content,
      access_token: business.meta_access_token
    };
    
    if (isVideo) {
      containerBody.media_type = 'VIDEO';
      containerBody.video_url = mediaUrls[0];
    } else {
      containerBody.image_url = mediaUrls[0];
    }

    const containerResponse = await fetch(containerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody)
    });

    const containerData = await containerResponse.json() as MediaUploadResponse;
    
    if (!containerData.id) {
      return { success: false, error: 'Failed to create media container' };
    }

    // Step 2: Publish the container
    const publishEndpoint = META_BASE_URL + '/' + META_API_VERSION + '/' + business.instagram_account_id + '/media_publish';
    
    const publishResponse = await fetch(publishEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: business.meta_access_token
      })
    });

    const publishData = await publishResponse.json() as PostResponse;
    
    if (publishData.id) {
      return { success: true, postId: publishData.id };
    }
    
    return { success: false, error: 'Failed to publish' };
  } catch (error) {
    console.error('Instagram post error:', error);
    return { success: false, error: String(error) };
  }
}

// Publish a social post to all selected platforms
export async function publishSocialPost(
  post: SocialPost,
  business: Business
): Promise<{ success: boolean; results: Record<string, { postId?: string; error?: string }> }> {
  const results: Record<string, { postId?: string; error?: string }> = {};
  const mediaUrls = post.processed_media_urls.length > 0 ? post.processed_media_urls : post.media_urls;
  
  for (const platform of post.platforms) {
    if (platform === 'facebook') {
      const fbResult = await postToFacebook(business, post.content, mediaUrls);
      results.facebook = fbResult.success ? { postId: fbResult.postId } : { error: fbResult.error };
    }
    
    if (platform === 'instagram') {
      const igResult = await postToInstagram(business, post.content, mediaUrls);
      results.instagram = igResult.success ? { postId: igResult.postId } : { error: igResult.error };
    }
  }

  const anySuccess = Object.values(results).some(r => r.postId);
  
  // Update post record
  const postIds: Record<string, string> = {};
  for (const [platform, result] of Object.entries(results)) {
    if (result.postId) postIds[platform] = result.postId;
  }
  
  await supabase.from('social_posts').update({
    status: anySuccess ? 'posted' : 'failed',
    posted_at: anySuccess ? new Date().toISOString() : null,
    post_ids: postIds
  }).eq('id', post.id);

  return { success: anySuccess, results };
}

// Get engagement stats for a post
export async function getPostEngagement(
  business: Business,
  postId: string,
  platform: 'facebook' | 'instagram'
): Promise<{ likes: number; comments: number; shares: number; reach: number }> {
  if (!business.meta_access_token) {
    return { likes: 0, comments: 0, shares: 0, reach: 0 };
  }

  try {
    const fields = platform === 'instagram' 
      ? 'like_count,comments_count,reach'
      : 'likes.summary(true),comments.summary(true),shares,insights.metric(post_impressions)';
    
    const endpoint = META_BASE_URL + '/' + META_API_VERSION + '/' + postId + '?fields=' + fields + '&access_token=' + business.meta_access_token;
    
    const response = await fetch(endpoint);
    const data = await response.json() as Record<string, unknown>;
    
    if (platform === 'instagram') {
      return {
        likes: (data.like_count as number) || 0,
        comments: (data.comments_count as number) || 0,
        shares: 0,
        reach: (data.reach as number) || 0
      };
    } else {
      const likesData = data.likes as { summary?: { total_count?: number } };
      const commentsData = data.comments as { summary?: { total_count?: number } };
      const sharesData = data.shares as { count?: number };
      
      return {
        likes: likesData?.summary?.total_count || 0,
        comments: commentsData?.summary?.total_count || 0,
        shares: sharesData?.count || 0,
        reach: 0
      };
    }
  } catch (error) {
    console.error('Error fetching engagement:', error);
    return { likes: 0, comments: 0, shares: 0, reach: 0 };
  }
}

// Generate review link for Google Business
export function generateGoogleReviewLink(placeId: string): string {
  return 'https://search.google.com/local/writereview?placeid=' + placeId;
}
