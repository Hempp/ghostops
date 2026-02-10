// ===========================================
// DASHBOARD API ROUTES
// PRISM-UX Agent: Dashboard Data
// ===========================================

import { Router, Request, Response } from 'express';
import { supabase, getBusinessMetrics, getUnpaidInvoices, getRecentReviews } from '../../lib/supabase.js';

export const dashboardRouter = Router();

// ===========================================
// DASHBOARD OVERVIEW
// ===========================================

dashboardRouter.get('/:businessId/overview', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;

    const [metrics, unpaidInvoices, recentReviews] = await Promise.all([
      getBusinessMetrics(businessId),
      getUnpaidInvoices(businessId),
      getRecentReviews(businessId, 7),
    ]);

    res.json({
      metrics,
      unpaidInvoices: unpaidInvoices.slice(0, 5),
      recentReviews: recentReviews.slice(0, 5),
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ===========================================
// CONVERSATIONS (iMessage-style threads)
// ===========================================

dashboardRouter.get('/:businessId/conversations', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { limit = 50, offset = 0, status } = req.query;

    let query = supabase
      .from('conversations')
      .select(`
        *,
        messages:messages(count)
      `)
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: conversations, error } = await query;

    if (error) throw error;

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

dashboardRouter.get('/:businessId/conversations/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const [conversation, messages] = await Promise.all([
      supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single(),
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
    ]);

    if (conversation.error) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      conversation: conversation.data,
      messages: messages.data || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// ===========================================
// INVOICES
// ===========================================

dashboardRouter.get('/:businessId/invoices', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error } = await query;

    if (error) throw error;

    // Calculate totals
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('amount, status')
      .eq('business_id', businessId);

    const totals = {
      total: (allInvoices || []).reduce((sum, inv) => sum + inv.amount, 0) / 100,
      paid: (allInvoices || [])
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0) / 100,
      pending: (allInvoices || [])
        .filter(inv => ['pending', 'sent', 'reminded'].includes(inv.status))
        .reduce((sum, inv) => sum + inv.amount, 0) / 100,
      overdue: (allInvoices || [])
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.amount, 0) / 100,
    };

    res.json({ invoices, totals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// ===========================================
// SOCIAL POSTS (Content Calendar)
// ===========================================

dashboardRouter.get('/:businessId/social-posts', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('social_posts')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: posts, error } = await query;

    if (error) throw error;

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch social posts' });
  }
});

// Calendar view (by month)
dashboardRouter.get('/:businessId/social-calendar', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { year, month } = req.query;

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);

    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('business_id', businessId)
      .or(`scheduled_for.gte.${startDate.toISOString()},posted_at.gte.${startDate.toISOString()}`)
      .or(`scheduled_for.lte.${endDate.toISOString()},posted_at.lte.${endDate.toISOString()}`)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

// ===========================================
// LEADS
// ===========================================

dashboardRouter.get('/:businessId/leads', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('leads')
      .select(`
        *,
        conversations(contact_phone, contact_name)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: leads, error } = await query;

    if (error) throw error;

    res.json({ leads });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// ===========================================
// REVIEWS
// ===========================================

dashboardRouter.get('/:businessId/reviews', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    // Calculate stats
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('business_id', businessId);

    const stats = {
      total: allReviews?.length || 0,
      average: allReviews?.length
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0,
      distribution: {
        5: allReviews?.filter(r => r.rating === 5).length || 0,
        4: allReviews?.filter(r => r.rating === 4).length || 0,
        3: allReviews?.filter(r => r.rating === 3).length || 0,
        2: allReviews?.filter(r => r.rating === 2).length || 0,
        1: allReviews?.filter(r => r.rating === 1).length || 0,
      },
    };

    res.json({ reviews, stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ===========================================
// ANALYTICS
// ===========================================

dashboardRouter.get('/:businessId/analytics', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { period = '7d' } = req.query;

    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily metrics
    const [leads, invoices, reviews, posts] = await Promise.all([
      supabase
        .from('leads')
        .select('created_at')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('invoices')
        .select('amount, status, created_at, paid_at')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('reviews')
        .select('rating, created_at')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('social_posts')
        .select('engagement, posted_at')
        .eq('business_id', businessId)
        .eq('status', 'posted')
        .gte('posted_at', startDate.toISOString()),
    ]);

    // Aggregate by day
    const dailyData: Record<string, {
      leads: number;
      revenue: number;
      reviews: number;
      engagement: number;
    }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dailyData[key] = { leads: 0, revenue: 0, reviews: 0, engagement: 0 };
    }

    leads.data?.forEach(lead => {
      const key = lead.created_at.split('T')[0];
      if (dailyData[key]) dailyData[key].leads++;
    });

    invoices.data?.forEach(inv => {
      if (inv.status === 'paid' && inv.paid_at) {
        const key = inv.paid_at.split('T')[0];
        if (dailyData[key]) dailyData[key].revenue += inv.amount / 100;
      }
    });

    reviews.data?.forEach(review => {
      const key = review.created_at.split('T')[0];
      if (dailyData[key]) dailyData[key].reviews++;
    });

    posts.data?.forEach(post => {
      if (post.posted_at) {
        const key = post.posted_at.split('T')[0];
        const eng = post.engagement as { likes: number; comments: number; shares: number };
        if (dailyData[key]) {
          dailyData[key].engagement += (eng.likes || 0) + (eng.comments || 0) + (eng.shares || 0);
        }
      }
    });

    res.json({
      period,
      data: Object.entries(dailyData)
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});
