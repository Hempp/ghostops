/**
 * GhostOps Local Development Server
 * Mocks Firebase Cloud Functions for local testing
 */

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// In-memory mock database
const mockDb = {
  businesses: new Map<string, any>(),
  conversations: new Map<string, any>(),
  messages: new Map<string, any[]>(),
  invoices: new Map<string, any[]>(),
  stats: new Map<string, any>(),
  socialPosts: new Map<string, any[]>(),
}

// Initialize demo data
function initDemoData() {
  const businessId = 'demo-business'

  mockDb.businesses.set(businessId, {
    id: businessId,
    name: 'Demo Plumbing Co',
    ownerPhone: '+15551234567',
    email: 'owner@demo.com',
    industry: 'plumbing',
    onboardingComplete: true,
    createdAt: new Date().toISOString()
  })

  mockDb.stats.set(businessId, {
    totalCalls: 47,
    missedCalls: 12,
    textbacksSent: 12,
    appointmentsBooked: 23,
    invoicesSent: 18,
    invoicesPaid: 14,
    revenue: 24500,
    date: new Date().toISOString().split('T')[0]
  })

  mockDb.conversations.set('conv-1', {
    id: 'conv-1',
    businessId,
    customerPhone: '+15559876543',
    customerName: 'Sarah Chen',
    lastMessage: 'Thanks! Payment sent.',
    lastMessageAt: new Date().toISOString(),
    unread: false
  })

  mockDb.messages.set('conv-1', [
    { role: 'customer', content: 'Hi, I need help with my sink', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { role: 'assistant', content: 'Hi Sarah! I\'d be happy to help. Can you describe the issue?', timestamp: new Date(Date.now() - 3500000).toISOString() },
    { role: 'customer', content: 'It\'s leaking under the cabinet', timestamp: new Date(Date.now() - 3400000).toISOString() },
    { role: 'assistant', content: 'I can schedule a technician for tomorrow at 2pm. Does that work?', timestamp: new Date(Date.now() - 3300000).toISOString() },
    { role: 'customer', content: 'Perfect!', timestamp: new Date(Date.now() - 3200000).toISOString() },
  ])

  mockDb.invoices.set(businessId, [
    { id: 'inv-1', customerName: 'Sarah Chen', amount: 250, status: 'paid', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'inv-2', customerName: 'Mike Johnson', amount: 1500, status: 'pending', createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'inv-3', customerName: 'Lisa Wong', amount: 875, status: 'pending', createdAt: new Date(Date.now() - 259200000).toISOString() },
  ])

  mockDb.socialPosts.set(businessId, [
    { id: 'post-1', platform: 'instagram', content: 'Check out this kitchen remodel!', status: 'published', scheduledFor: new Date(Date.now() - 86400000).toISOString() },
    { id: 'post-2', platform: 'facebook', content: '5-star review from a happy customer!', status: 'scheduled', scheduledFor: new Date(Date.now() + 86400000).toISOString() },
  ])

  console.log('✓ Demo data initialized')
}

// ============================================
// TWILIO WEBHOOK (Mock)
// ============================================
app.post('/twilioSms', (req, res) => {
  const { From, Body } = req.body
  console.log(`📱 SMS from ${From}: ${Body}`)

  // Simple AI response simulation
  let response = "Thanks for your message! Our AI assistant is processing your request."

  if (Body?.toLowerCase().includes('schedule') || Body?.toLowerCase().includes('appointment')) {
    response = "I'd be happy to schedule an appointment for you. What day works best?"
  } else if (Body?.toLowerCase().includes('invoice')) {
    response = "I'll prepare that invoice right away. You'll receive a payment link shortly."
  } else if (Body?.toLowerCase().includes("what's my day") || Body?.toLowerCase().includes('schedule today')) {
    response = "You have 3 appointments today:\n9AM - Johnson kitchen\n1PM - Smith bathroom\n4PM - Follow-up call with Mike"
  }

  // TwiML response
  res.set('Content-Type', 'text/xml')
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${response}</Message>
</Response>`)
})

app.post('/twilioVoice', (req, res) => {
  console.log('📞 Incoming call:', req.body)

  res.set('Content-Type', 'text/xml')
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thanks for calling! We'll text you right back with assistance.</Say>
</Response>`)
})

// ============================================
// API ENDPOINTS (Mock)
// ============================================
app.get('/api/stats/:businessId', (req, res) => {
  const stats = mockDb.stats.get(req.params.businessId) || mockDb.stats.get('demo-business')
  res.json(stats)
})

app.get('/api/conversations/:businessId', (req, res) => {
  const conversations = Array.from(mockDb.conversations.values())
    .filter(c => c.businessId === req.params.businessId || req.params.businessId === 'demo-business')
  res.json(conversations)
})

app.get('/api/messages/:conversationId', (req, res) => {
  const messages = mockDb.messages.get(req.params.conversationId) || []
  res.json(messages)
})

app.get('/api/invoices/:businessId', (req, res) => {
  const invoices = mockDb.invoices.get(req.params.businessId) || mockDb.invoices.get('demo-business') || []
  res.json(invoices)
})

app.get('/api/social-posts/:businessId', (req, res) => {
  const posts = mockDb.socialPosts.get(req.params.businessId) || mockDb.socialPosts.get('demo-business') || []
  res.json(posts)
})

app.post('/api/send-message', (req, res) => {
  const { conversationId, message } = req.body
  const messages = mockDb.messages.get(conversationId) || []
  messages.push({
    role: 'assistant',
    content: message,
    timestamp: new Date().toISOString()
  })
  mockDb.messages.set(conversationId, messages)
  res.json({ success: true })
})

app.post('/api/create-invoice', (req, res) => {
  const { businessId, customerName, amount, description } = req.body
  const invoices = mockDb.invoices.get(businessId) || []
  const newInvoice = {
    id: `inv-${Date.now()}`,
    customerName,
    amount,
    description,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
  invoices.push(newInvoice)
  mockDb.invoices.set(businessId, invoices)
  res.json(newInvoice)
})

app.post('/api/schedule-post', (req, res) => {
  const { businessId, platform, content, scheduledFor } = req.body
  const posts = mockDb.socialPosts.get(businessId) || []
  const newPost = {
    id: `post-${Date.now()}`,
    platform,
    content,
    status: 'scheduled',
    scheduledFor,
    createdAt: new Date().toISOString()
  }
  posts.push(newPost)
  mockDb.socialPosts.set(businessId, posts)
  res.json(newPost)
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: 'local-mock' })
})

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5001

initDemoData()

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔥 GhostOps Local Server Running                        ║
║                                                           ║
║   API:     http://localhost:${PORT}/api                      ║
║   Twilio:  http://localhost:${PORT}/twilioSms                ║
║   Health:  http://localhost:${PORT}/health                   ║
║                                                           ║
║   Mode: Local Mock (no Firebase required)                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `)
})
