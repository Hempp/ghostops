// GhostOps Main Server - NEXUS-PRIME Architecture
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Webhook routers
import twilioWebhook from './api/webhooks/twilio.js';
import stripeWebhook from './api/webhooks/stripe.js';
import leadsWebhook from './api/webhooks/leads.js';
import reviewsWebhook from './api/webhooks/reviews.js';
import whatsappWebhook from './api/webhooks/whatsapp.js';

// Middleware
import { authenticateApiKey, authorizeBusinessAccess } from './middleware/auth.js';
import { apiRateLimiter } from './middleware/rateLimit.js';

// Scheduler
import { initializeScheduler } from './lib/scheduler/cron.js';

// Shared Supabase client
import { supabase } from './lib/supabase.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.DASHBOARD_URL || 'http://localhost:3001',
  credentials: true
}));

// Stripe webhook needs raw body
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// Parse JSON for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ghostops',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Webhook routes
app.use('/webhooks/twilio', twilioWebhook);
app.use('/webhooks/stripe', stripeWebhook);
app.use('/webhooks/leads', leadsWebhook);
app.use('/webhooks/reviews', reviewsWebhook);
app.use('/webhooks/whatsapp', whatsappWebhook);

// API routes for dashboard - Protected with authentication
// All /api/businesses routes require authentication and business access authorization
app.get('/api/businesses/:id', apiRateLimiter, authenticateApiKey, authorizeBusinessAccess, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Business not found' });
    res.json(data);
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/businesses/:id/conversations', apiRateLimiter, authenticateApiKey, authorizeBusinessAccess, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100); // Max 100
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { data } = await supabase
      .from('conversations')
      .select('*, contacts(*), messages(*)')
      .eq('business_id', req.params.id)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/businesses/:id/invoices', apiRateLimiter, authenticateApiKey, authorizeBusinessAccess, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200); // Max 200
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('business_id', req.params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/businesses/:id/posts', apiRateLimiter, authenticateApiKey, authorizeBusinessAccess, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100); // Max 100
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { data } = await supabase
      .from('social_posts')
      .select('*')
      .eq('business_id', req.params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/businesses/:id/stats', apiRateLimiter, authenticateApiKey, authorizeBusinessAccess, async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: stats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('business_id', req.params.id)
      .gte('date', weekAgo)
      .order('date', { ascending: false });

    const { count: unpaidCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', req.params.id)
      .in('status', ['sent', 'viewed', 'overdue']);

    const { data: unpaidTotal } = await supabase
      .from('invoices')
      .select('amount_cents')
      .eq('business_id', req.params.id)
      .in('status', ['sent', 'viewed', 'overdue']);

    res.json({
      daily: stats || [],
      unpaid_invoices: unpaidCount || 0,
      unpaid_total: unpaidTotal?.reduce((sum, i) => sum + i.amount_cents, 0) || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════╗');
  console.log('  ║          GHOSTOPS AI CO-FOUNDER           ║');
  console.log('  ║         "Your Ghost Employee" 👻          ║');
  console.log('  ╠═══════════════════════════════════════════╣');
  console.log('  ║  Server running on port ' + PORT + '              ║');
  console.log('  ║  WhatsApp: /webhooks/whatsapp             ║');
  console.log('  ║  SMS:      /webhooks/twilio               ║');
  console.log('  ║  Dashboard API at /api/*                  ║');
  console.log('  ╚═══════════════════════════════════════════╝');
  console.log('');
  
  // Initialize scheduler
  initializeScheduler();
});

export default app;
