import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

const db = admin.firestore()

// ============================================
// REST API FOR DASHBOARD
// ============================================
export const api = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  // Parse path
  const path = req.path.split('/').filter(Boolean)
  const [resource, id] = path

  // Verify auth token (from Firebase Auth or API key)
  const authHeader = req.headers.authorization
  const businessId = await verifyAuth(authHeader)

  if (!businessId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    switch (resource) {
      case 'conversations':
        await handleConversations(req, res, businessId, id)
        break

      case 'messages':
        await handleMessages(req, res, businessId, id)
        break

      case 'invoices':
        await handleInvoices(req, res, businessId, id)
        break

      case 'stats':
        await handleStats(req, res, businessId)
        break

      case 'social':
        await handleSocial(req, res, businessId, id)
        break

      case 'business':
        await handleBusiness(req, res, businessId)
        break

      default:
        res.status(404).json({ error: 'Not found' })
    }
  } catch (error: any) {
    console.error('API error:', error)
    res.status(500).json({ error: error.message || 'Internal error' })
  }
})

async function verifyAuth(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader) return null

  // Handle Bearer token (Firebase Auth)
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decoded = await admin.auth().verifyIdToken(token)
      // Get business ID from user claims or lookup
      const userDoc = await db.collection('users').doc(decoded.uid).get()
      return userDoc.data()?.business_id || null
    } catch {
      return null
    }
  }

  // Handle API key
  if (authHeader.startsWith('ApiKey ')) {
    const apiKey = authHeader.substring(7)
    const businessSnap = await db
      .collection('businesses')
      .where('api_key', '==', apiKey)
      .limit(1)
      .get()

    return businessSnap.empty ? null : businessSnap.docs[0].id
  }

  return null
}

// ============================================
// CONVERSATIONS
// ============================================
async function handleConversations(
  req: functions.https.Request,
  res: functions.Response,
  businessId: string,
  conversationId?: string
) {
  if (req.method === 'GET') {
    if (conversationId) {
      const doc = await db.collection('conversations').doc(conversationId).get()
      if (!doc.exists || doc.data()?.business_id !== businessId) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      res.json({ id: doc.id, ...doc.data() })
    } else {
      const snapshot = await db
        .collection('conversations')
        .where('business_id', '==', businessId)
        .orderBy('last_message_at', 'desc')
        .limit(50)
        .get()

      const conversations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      res.json(conversations)
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

// ============================================
// MESSAGES
// ============================================
async function handleMessages(
  req: functions.https.Request,
  res: functions.Response,
  businessId: string,
  conversationId?: string
) {
  if (req.method === 'GET' && conversationId) {
    const snapshot = await db
      .collection('messages')
      .where('conversation_id', '==', conversationId)
      .where('business_id', '==', businessId)
      .orderBy('created_at', 'asc')
      .get()

    const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json(messages)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

// ============================================
// INVOICES
// ============================================
async function handleInvoices(
  req: functions.https.Request,
  res: functions.Response,
  businessId: string,
  invoiceId?: string
) {
  if (req.method === 'GET') {
    if (invoiceId) {
      const doc = await db.collection('invoices').doc(invoiceId).get()
      if (!doc.exists || doc.data()?.business_id !== businessId) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      res.json({ id: doc.id, ...doc.data() })
    } else {
      const snapshot = await db
        .collection('invoices')
        .where('business_id', '==', businessId)
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()

      const invoices = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      res.json(invoices)
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

// ============================================
// STATS
// ============================================
async function handleStats(
  req: functions.https.Request,
  res: functions.Response,
  businessId: string
) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const days = parseInt(req.query.days as string) || 7
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const snapshot = await db
    .collection('daily_stats')
    .where('business_id', '==', businessId)
    .where('date', '>=', sinceStr)
    .orderBy('date', 'desc')
    .get()

  const stats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

  // Aggregate totals
  const totals = stats.reduce(
    (acc, s: any) => ({
      messages: acc.messages + (s.customer_messages || 0) + (s.owner_messages || 0),
      revenue: acc.revenue + (s.revenue_cents || 0),
      missed_calls: acc.missed_calls + (s.missed_calls || 0),
      new_leads: acc.new_leads + (s.new_leads || 0),
      invoices_sent: acc.invoices_sent + (s.invoices_sent || 0),
      invoices_paid: acc.invoices_paid + (s.invoices_paid || 0),
    }),
    { messages: 0, revenue: 0, missed_calls: 0, new_leads: 0, invoices_sent: 0, invoices_paid: 0 }
  )

  res.json({ daily: stats, totals })
}

// ============================================
// SOCIAL
// ============================================
async function handleSocial(
  req: functions.https.Request,
  res: functions.Response,
  businessId: string,
  postId?: string
) {
  if (req.method === 'GET') {
    const snapshot = await db
      .collection('scheduled_posts')
      .where('business_id', '==', businessId)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()

    const posts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json(posts)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

// ============================================
// BUSINESS
// ============================================
async function handleBusiness(
  req: functions.https.Request,
  res: functions.Response,
  businessId: string
) {
  const doc = await db.collection('businesses').doc(businessId).get()

  if (!doc.exists) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  if (req.method === 'GET') {
    const data = doc.data()
    // Don't expose sensitive fields
    const { google_tokens, api_key, stripe_customer_id, ...safe } = data as any
    res.json({ id: doc.id, ...safe })
  } else if (req.method === 'PUT') {
    const updates = req.body
    // Only allow certain fields to be updated
    const allowed = ['name', 'email', 'industry', 'brand_voice', 'morning_briefing_enabled']
    const filtered: Record<string, any> = {}

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        filtered[key] = updates[key]
      }
    }

    await doc.ref.update(filtered)
    res.json({ success: true })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
