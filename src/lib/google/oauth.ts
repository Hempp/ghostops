import { google } from 'googleapis'
import { supabase } from '../supabase.js'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'https://api.ghostops.ai/auth/google/callback'
)

// Scopes needed for calendar + email + business profile
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/business.manage', // Google Business Profile
  'https://www.googleapis.com/auth/userinfo.email',
]

export function generateAuthUrl(businessId: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: businessId, // Pass business ID through OAuth flow
    prompt: 'consent', // Force consent to get refresh token
  })
}

export async function handleOAuthCallback(code: string, businessId: string): Promise<{
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}> {
  const { tokens } = await oauth2Client.getToken(code)

  // Store tokens in Supabase
  await supabase
    .from('businesses')
    .update({
      google_tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
      google_connected: true,
    })
    .eq('id', businessId)

  return tokens
}

export async function getAuthenticatedClient(businessId: string) {
  // Fetch tokens from database
  const { data: business } = await supabase
    .from('businesses')
    .select('google_tokens')
    .eq('id', businessId)
    .single()

  if (!business?.google_tokens) {
    return null
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  client.setCredentials(business.google_tokens)

  // Handle token refresh
  client.on('tokens', async (tokens) => {
    const update: Record<string, unknown> = {
      'google_tokens.access_token': tokens.access_token,
      'google_tokens.expiry_date': tokens.expiry_date,
    }
    if (tokens.refresh_token) {
      update['google_tokens.refresh_token'] = tokens.refresh_token
    }

    await supabase
      .from('businesses')
      .update({ google_tokens: { ...business.google_tokens, ...tokens } })
      .eq('id', businessId)
  })

  return client
}

export async function revokeAccess(businessId: string) {
  const { data: business } = await supabase
    .from('businesses')
    .select('google_tokens')
    .eq('id', businessId)
    .single()

  if (business?.google_tokens?.access_token) {
    await oauth2Client.revokeToken(business.google_tokens.access_token)
  }

  await supabase
    .from('businesses')
    .update({ google_tokens: null, google_connected: false })
    .eq('id', businessId)
}
