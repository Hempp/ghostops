// ===========================================
// BUSINESS API ROUTES
// FORGE-X Agent: Business Management
// ===========================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase, updateBusinessSettings } from '../../lib/supabase.js';
import { purchasePhoneNumber, configurePhoneNumber } from '../../lib/twilio.js';
import { createConnectedAccount, createAccountLink } from '../../lib/stripe.js';
import { getOAuthUrl } from '../../lib/meta.js';
import type { Business } from '../../types/index.js';

export const businessRouter = Router();

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const createBusinessSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().min(1),
  ownerPhone: z.string().regex(/^\+1\d{10}$/),
  ownerEmail: z.string().email(),
  industry: z.string().min(1),
  brandVoice: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  areaCode: z.string().optional(),
});

const updateSettingsSchema = z.object({
  autoReplyEnabled: z.boolean().optional(),
  missedCallTextback: z.boolean().optional(),
  speedToLeadEnabled: z.boolean().optional(),
  reviewRequestsEnabled: z.boolean().optional(),
  morningBriefingTime: z.string().optional(),
  morningBriefingEnabled: z.boolean().optional(),
  invoiceReminderDays: z.array(z.number()).optional(),
  paused: z.boolean().optional(),
});

// ===========================================
// BUSINESS CRUD
// ===========================================

businessRouter.post('/', async (req: Request, res: Response) => {
  try {
    const input = createBusinessSchema.parse(req.body);

    // Purchase Twilio number
    console.log(`📱 Purchasing phone number for ${input.name}...`);
    const twilioNumber = await purchasePhoneNumber(input.areaCode);

    // Create business record
    const { data: business, error } = await supabase
      .from('businesses')
      .insert({
        name: input.name,
        owner_name: input.ownerName,
        owner_phone: input.ownerPhone,
        twilio_number: twilioNumber,
        industry: input.industry,
        brand_voice: input.brandVoice || 'professional and friendly',
        timezone: input.timezone,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Business created: ${business.name} (${twilioNumber})`);

    res.status(201).json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        twilioNumber: business.twilio_number,
      },
    });
  } catch (error) {
    console.error('Create business error:', error);
    res.status(400).json({
      error: error instanceof z.ZodError ? error.errors : 'Failed to create business',
    });
  }
});

businessRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ business });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

businessRouter.patch('/:id/settings', async (req: Request, res: Response) => {
  try {
    const input = updateSettingsSchema.parse(req.body);

    // Convert camelCase to snake_case for database
    const settings: Record<string, unknown> = {};
    if (input.autoReplyEnabled !== undefined) settings.auto_reply_enabled = input.autoReplyEnabled;
    if (input.missedCallTextback !== undefined) settings.missed_call_textback = input.missedCallTextback;
    if (input.speedToLeadEnabled !== undefined) settings.speed_to_lead_enabled = input.speedToLeadEnabled;
    if (input.reviewRequestsEnabled !== undefined) settings.review_requests_enabled = input.reviewRequestsEnabled;
    if (input.morningBriefingTime !== undefined) settings.morning_briefing_time = input.morningBriefingTime;
    if (input.morningBriefingEnabled !== undefined) settings.morning_briefing_enabled = input.morningBriefingEnabled;
    if (input.invoiceReminderDays !== undefined) settings.invoice_reminder_days = input.invoiceReminderDays;
    if (input.paused !== undefined) settings.paused = input.paused;

    await updateBusinessSettings(req.params.id, settings);

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update settings' });
  }
});

// ===========================================
// INTEGRATION SETUP
// ===========================================

// Stripe Connect onboarding
businessRouter.post('/:id/integrations/stripe', async (req: Request, res: Response) => {
  try {
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Create Stripe connected account
    const accountId = await createConnectedAccount(
      req.body.email || `${business.id}@ghostops.local`,
      business.name
    );

    // Save account ID
    await supabase
      .from('businesses')
      .update({
        integrations: {
          ...business.integrations,
          stripe_account_id: accountId,
        },
      })
      .eq('id', business.id);

    // Create onboarding link
    const accountLink = await createAccountLink(
      accountId,
      `${process.env.DASHBOARD_URL}/integrations/stripe/refresh`,
      `${process.env.DASHBOARD_URL}/integrations/stripe/complete`
    );

    res.json({ onboardingUrl: accountLink });
  } catch (error) {
    console.error('Stripe integration error:', error);
    res.status(500).json({ error: 'Failed to set up Stripe integration' });
  }
});

// Meta (Facebook/Instagram) OAuth
businessRouter.get('/:id/integrations/meta/auth', async (req: Request, res: Response) => {
  try {
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const oauthUrl = getOAuthUrl(
      process.env.META_APP_ID!,
      `${process.env.API_URL}/api/business/${business.id}/integrations/meta/callback`,
      business.id // Use business ID as state
    );

    res.json({ authUrl: oauthUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

businessRouter.get('/:id/integrations/meta/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const businessId = state as string;

    if (businessId !== req.params.id) {
      return res.status(400).json({ error: 'State mismatch' });
    }

    const { exchangeCodeForToken, getLongLivedToken, getConnectedAccounts } = await import('../../lib/meta.js');

    // Exchange code for token
    const { accessToken: shortToken } = await exchangeCodeForToken(
      process.env.META_APP_ID!,
      process.env.META_APP_SECRET!,
      `${process.env.API_URL}/api/business/${businessId}/integrations/meta/callback`,
      code as string
    );

    // Get long-lived token
    const { accessToken: longToken } = await getLongLivedToken(
      process.env.META_APP_ID!,
      process.env.META_APP_SECRET!,
      shortToken
    );

    // Get connected accounts
    const accounts = await getConnectedAccounts(longToken);

    // Save to database
    const { data: business } = await supabase
      .from('businesses')
      .select('integrations')
      .eq('id', businessId)
      .single();

    await supabase
      .from('businesses')
      .update({
        integrations: {
          ...business?.integrations,
          meta_access_token: longToken,
          meta_page_id: accounts.facebookPages[0]?.id,
          meta_instagram_id: accounts.instagramAccounts[0]?.id,
        },
      })
      .eq('id', businessId);

    // Redirect to dashboard
    res.redirect(`${process.env.DASHBOARD_URL}/integrations/meta/complete`);
  } catch (error) {
    console.error('Meta callback error:', error);
    res.redirect(`${process.env.DASHBOARD_URL}/integrations/meta/error`);
  }
});

// ===========================================
// BUSINESS LISTING (for dashboard)
// ===========================================

businessRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, name, twilio_number, industry, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ businesses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});
