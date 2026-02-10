// ===========================================
// META GRAPH API SERVICE
// PRISM Agent: Social Media Integration
// ===========================================

import axios, { AxiosInstance } from 'axios';
import type { SocialPlatform, PostEngagement } from '../types/index.js';

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaApiClient {
  instance: AxiosInstance;
  accessToken: string;
}

function createMetaClient(accessToken: string): MetaApiClient {
  return {
    instance: axios.create({
      baseURL: META_BASE_URL,
      params: {
        access_token: accessToken,
      },
    }),
    accessToken,
  };
}

// ===========================================
// INSTAGRAM PUBLISHING
// ===========================================

export async function postToInstagram(
  accessToken: string,
  instagramAccountId: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const client = createMetaClient(accessToken);

  // Step 1: Create media container
  const containerResponse = await client.instance.post(
    `/${instagramAccountId}/media`,
    null,
    {
      params: {
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      },
    }
  );

  const containerId = containerResponse.data.id;

  // Step 2: Wait for container to be ready (poll status)
  let status = 'IN_PROGRESS';
  let attempts = 0;
  const maxAttempts = 30;

  while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusResponse = await client.instance.get(`/${containerId}`, {
      params: {
        fields: 'status_code',
        access_token: accessToken,
      },
    });

    status = statusResponse.data.status_code;
    attempts++;
  }

  if (status !== 'FINISHED') {
    throw new Error(`Media container failed with status: ${status}`);
  }

  // Step 3: Publish the container
  const publishResponse = await client.instance.post(
    `/${instagramAccountId}/media_publish`,
    null,
    {
      params: {
        creation_id: containerId,
        access_token: accessToken,
      },
    }
  );

  return publishResponse.data.id;
}

export async function postCarouselToInstagram(
  accessToken: string,
  instagramAccountId: string,
  imageUrls: string[],
  caption: string
): Promise<string> {
  const client = createMetaClient(accessToken);

  // Step 1: Create individual item containers
  const containerIds = await Promise.all(
    imageUrls.map(async (url) => {
      const response = await client.instance.post(
        `/${instagramAccountId}/media`,
        null,
        {
          params: {
            image_url: url,
            is_carousel_item: true,
            access_token: accessToken,
          },
        }
      );
      return response.data.id;
    })
  );

  // Step 2: Create carousel container
  const carouselResponse = await client.instance.post(
    `/${instagramAccountId}/media`,
    null,
    {
      params: {
        media_type: 'CAROUSEL',
        caption,
        children: containerIds.join(','),
        access_token: accessToken,
      },
    }
  );

  // Step 3: Wait and publish
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const publishResponse = await client.instance.post(
    `/${instagramAccountId}/media_publish`,
    null,
    {
      params: {
        creation_id: carouselResponse.data.id,
        access_token: accessToken,
      },
    }
  );

  return publishResponse.data.id;
}

// ===========================================
// FACEBOOK PUBLISHING
// ===========================================

export async function postToFacebook(
  accessToken: string,
  pageId: string,
  message: string,
  imageUrl?: string
): Promise<string> {
  const client = createMetaClient(accessToken);

  if (imageUrl) {
    // Post with image
    const response = await client.instance.post(`/${pageId}/photos`, null, {
      params: {
        url: imageUrl,
        message,
        access_token: accessToken,
      },
    });
    return response.data.id;
  } else {
    // Text-only post
    const response = await client.instance.post(`/${pageId}/feed`, null, {
      params: {
        message,
        access_token: accessToken,
      },
    });
    return response.data.id;
  }
}

export async function postMultiplePhotosToFacebook(
  accessToken: string,
  pageId: string,
  message: string,
  imageUrls: string[]
): Promise<string> {
  const client = createMetaClient(accessToken);

  // Upload photos as unpublished
  const photoIds = await Promise.all(
    imageUrls.map(async (url) => {
      const response = await client.instance.post(`/${pageId}/photos`, null, {
        params: {
          url,
          published: false,
          access_token: accessToken,
        },
      });
      return response.data.id;
    })
  );

  // Create post with attached photos
  const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));

  const response = await client.instance.post(`/${pageId}/feed`, null, {
    params: {
      message,
      attached_media: JSON.stringify(attachedMedia),
      access_token: accessToken,
    },
  });

  return response.data.id;
}

// ===========================================
// ENGAGEMENT METRICS
// ===========================================

export async function getPostEngagement(
  accessToken: string,
  postId: string,
  platform: SocialPlatform
): Promise<PostEngagement> {
  const client = createMetaClient(accessToken);

  if (platform === 'instagram') {
    const response = await client.instance.get(`/${postId}`, {
      params: {
        fields: 'like_count,comments_count,reach',
        access_token: accessToken,
      },
    });

    return {
      likes: response.data.like_count || 0,
      comments: response.data.comments_count || 0,
      shares: 0, // Instagram doesn't expose shares
      reach: response.data.reach || 0,
    };
  } else {
    // Facebook
    const response = await client.instance.get(`/${postId}`, {
      params: {
        fields: 'reactions.summary(true),comments.summary(true),shares',
        access_token: accessToken,
      },
    });

    return {
      likes: response.data.reactions?.summary?.total_count || 0,
      comments: response.data.comments?.summary?.total_count || 0,
      shares: response.data.shares?.count || 0,
      reach: 0, // Would need insights API
    };
  }
}

// ===========================================
// ACCOUNT MANAGEMENT
// ===========================================

export async function getConnectedAccounts(accessToken: string): Promise<{
  facebookPages: Array<{ id: string; name: string; accessToken: string }>;
  instagramAccounts: Array<{ id: string; username: string }>;
}> {
  const client = createMetaClient(accessToken);

  // Get Facebook pages
  const pagesResponse = await client.instance.get('/me/accounts', {
    params: {
      fields: 'id,name,access_token',
      access_token: accessToken,
    },
  });

  const facebookPages = pagesResponse.data.data.map(
    (page: { id: string; name: string; access_token: string }) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
    })
  );

  // Get Instagram accounts connected to pages
  const instagramAccounts: Array<{ id: string; username: string }> = [];

  for (const page of facebookPages) {
    try {
      const igResponse = await client.instance.get(
        `/${page.id}?fields=instagram_business_account{id,username}`,
        {
          params: {
            access_token: page.accessToken,
          },
        }
      );

      if (igResponse.data.instagram_business_account) {
        instagramAccounts.push({
          id: igResponse.data.instagram_business_account.id,
          username: igResponse.data.instagram_business_account.username,
        });
      }
    } catch {
      // Page doesn't have Instagram connected
    }
  }

  return { facebookPages, instagramAccounts };
}

// ===========================================
// OAUTH FLOW
// ===========================================

export function getOAuthUrl(
  appId: string,
  redirectUri: string,
  state: string
): string {
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'business_management',
  ].join(',');

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
}

export async function exchangeCodeForToken(
  appId: string,
  appSecret: string,
  redirectUri: string,
  code: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await axios.get(`${META_BASE_URL}/oauth/access_token`, {
    params: {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    },
  });

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
  };
}

export async function getLongLivedToken(
  appId: string,
  appSecret: string,
  shortLivedToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await axios.get(`${META_BASE_URL}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    },
  });

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
  };
}

// ===========================================
// MEDIA HANDLING
// ===========================================

export async function uploadMediaFromUrl(
  accessToken: string,
  pageId: string,
  mediaUrl: string,
  mediaType: 'image' | 'video'
): Promise<string> {
  const client = createMetaClient(accessToken);

  if (mediaType === 'image') {
    const response = await client.instance.post(`/${pageId}/photos`, null, {
      params: {
        url: mediaUrl,
        published: false,
        access_token: accessToken,
      },
    });
    return response.data.id;
  } else {
    // Video upload is more complex - requires chunked upload for large files
    const response = await client.instance.post(`/${pageId}/videos`, null, {
      params: {
        file_url: mediaUrl,
        published: false,
        access_token: accessToken,
      },
    });
    return response.data.id;
  }
}

// ===========================================
// CONTENT SCHEDULING
// ===========================================

export async function schedulePost(
  accessToken: string,
  pageId: string,
  message: string,
  scheduledTime: Date,
  imageUrl?: string
): Promise<string> {
  const client = createMetaClient(accessToken);

  const scheduledPublishTime = Math.floor(scheduledTime.getTime() / 1000);

  if (imageUrl) {
    const response = await client.instance.post(`/${pageId}/photos`, null, {
      params: {
        url: imageUrl,
        message,
        published: false,
        scheduled_publish_time: scheduledPublishTime,
        access_token: accessToken,
      },
    });
    return response.data.id;
  } else {
    const response = await client.instance.post(`/${pageId}/feed`, null, {
      params: {
        message,
        published: false,
        scheduled_publish_time: scheduledPublishTime,
        access_token: accessToken,
      },
    });
    return response.data.id;
  }
}
