import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { google } from 'googleapis'
import { Twilio } from 'twilio'

const db = admin.firestore()

const twilio = new Twilio(
  functions.config().twilio?.account_sid,
  functions.config().twilio?.auth_token
)

const oauth2Client = new google.auth.OAuth2(
  functions.config().google?.client_id,
  functions.config().google?.client_secret,
  functions.config().google?.redirect_uri
)

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/userinfo.email',
]

// ============================================
// START GOOGLE AUTH
// ============================================
export const googleAuthStart = functions.https.onRequest(async (req, res) => {
  const businessId = req.query.business as string

  if (!businessId) {
    res.status(400).send('Missing business ID')
    return
  }

  // Verify business exists
  const businessDoc = await db.collection('businesses').doc(businessId).get()
  if (!businessDoc.exists) {
    res.status(404).send('Business not found')
    return
  }

  // Generate OAuth URL with business ID in state
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: businessId,
    prompt: 'consent',
  })

  res.redirect(authUrl)
})

// ============================================
// GOOGLE AUTH CALLBACK
// ============================================
export const googleAuthCallback = functions.https.onRequest(async (req, res) => {
  const { code, state: businessId, error } = req.query

  if (error) {
    res.send(`
      <html>
        <head><title>Connection Failed</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>Connection Failed</h1>
          <p>There was an error connecting your Google account: ${error}</p>
          <p>You can try again by texting your GhostOps number.</p>
        </body>
      </html>
    `)
    return
  }

  if (!code || !businessId) {
    res.status(400).send('Missing required parameters')
    return
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string)

    // Get user email
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()

    // Store tokens in Firestore
    await db
      .collection('businesses')
      .doc(businessId as string)
      .update({
        google_tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          scope: tokens.scope,
        },
        google_email: userInfo.data.email,
        google_connected: true,
        google_connected_at: admin.firestore.FieldValue.serverTimestamp(),
      })

    // Notify owner via SMS
    const businessDoc = await db
      .collection('businesses')
      .doc(businessId as string)
      .get()
    const business = businessDoc.data()

    if (business?.owner_phone && business?.twilio_number) {
      await twilio.messages.create({
        body: `Google connected! ✅ I can now manage your calendar and emails. Text me 'done' to continue setup.`,
        from: business.twilio_number,
        to: business.owner_phone,
      })
    }

    // Success page
    res.send(`
      <html>
        <head>
          <title>Connected!</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 40px 20px;
              text-align: center;
              background: #0a0a0a;
              color: white;
            }
            .success {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #10b981;
              margin-bottom: 10px;
            }
            p {
              color: #9ca3af;
              max-width: 300px;
              margin: 0 auto 20px;
            }
            .close-hint {
              color: #6b7280;
              font-size: 14px;
              margin-top: 40px;
            }
          </style>
        </head>
        <body>
          <div class="success">✅</div>
          <h1>Google Connected!</h1>
          <p>Your calendar and email are now linked to GhostOps.</p>
          <p>You can close this window and return to your text conversation.</p>
          <div class="close-hint">This window can be closed</div>
        </body>
      </html>
    `)
  } catch (error) {
    console.error('OAuth callback error:', error)
    res.status(500).send(`
      <html>
        <head><title>Connection Error</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>Something went wrong</h1>
          <p>We couldn't connect your Google account. Please try again.</p>
          <p>Text your GhostOps number for help.</p>
        </body>
      </html>
    `)
  }
})

// ============================================
// REFRESH TOKEN HANDLER (called internally)
// ============================================
export async function refreshGoogleToken(businessId: string): Promise<boolean> {
  const businessDoc = await db.collection('businesses').doc(businessId).get()
  const business = businessDoc.data()

  if (!business?.google_tokens?.refresh_token) {
    return false
  }

  try {
    oauth2Client.setCredentials({
      refresh_token: business.google_tokens.refresh_token,
    })

    const { credentials } = await oauth2Client.refreshAccessToken()

    await db
      .collection('businesses')
      .doc(businessId)
      .update({
        'google_tokens.access_token': credentials.access_token,
        'google_tokens.expiry_date': credentials.expiry_date,
      })

    return true
  } catch (error) {
    console.error('Token refresh failed:', error)

    // Mark as disconnected
    await db.collection('businesses').doc(businessId).update({
      google_connected: false,
    })

    return false
  }
}
