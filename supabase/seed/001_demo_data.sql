-- GhostOps Demo Data Seed
-- Run this after creating a demo user in Supabase Auth
-- Demo credentials: demo@ghostops.test / DemoPass123

-- ============================================================================
-- IMPORTANT: First, create the auth user manually in Supabase Dashboard
-- Go to Authentication > Users > Add user
-- Email: demo@ghostops.test
-- Password: DemoPass123
-- Then copy the user UUID and replace 'DEMO_USER_UUID' below
-- ============================================================================

-- Replace this with the actual UUID from Supabase Auth
-- You can find it in Authentication > Users after creating the user
DO $$
DECLARE
  demo_user_id UUID;
  demo_business_id UUID;
BEGIN
  -- Get the demo user's ID (must exist in auth.users first)
  SELECT id INTO demo_user_id
  FROM auth.users
  WHERE email = 'demo@ghostops.test'
  LIMIT 1;

  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'Demo user not found! Create user demo@ghostops.test in Supabase Auth first.';
  END IF;

  -- Create demo business
  INSERT INTO businesses (
    id,
    name,
    owner_email,
    owner_name,
    owner_phone,
    timezone,
    brand_voice,
    business_type,
    services,
    features_enabled,
    settings,
    onboarding_complete,
    is_active
  ) VALUES (
    uuid_generate_v4(),
    'Demo Plumbing Co.',
    'demo@ghostops.test',
    'Demo User',
    '+15551234567',
    'America/New_York',
    'friendly and professional, local small business vibe',
    'Home Services',
    '["Emergency Repairs", "Water Heater Installation", "Drain Cleaning", "Pipe Repair"]'::jsonb,
    '{"missed_call_textback":true,"speed_to_lead":true,"review_engine":true,"sms_invoicing":true,"social_posting":true,"morning_briefing":true,"ai_enabled":true,"auto_reply":true}'::jsonb,
    '{"notify_on_new_lead":true,"notify_on_payment":true,"notify_on_missed_call":true,"dark_mode":true}'::jsonb,
    true,
    true
  )
  RETURNING id INTO demo_business_id;

  -- Create public.users entry (if handle_new_user trigger didn't fire)
  INSERT INTO users (id, email, full_name)
  VALUES (demo_user_id, 'demo@ghostops.test', 'Demo User')
  ON CONFLICT (id) DO NOTHING;

  -- Link user to business
  INSERT INTO business_users (user_id, business_id, role)
  VALUES (demo_user_id, demo_business_id, 'owner');

  -- Create some demo contacts
  INSERT INTO contacts (business_id, phone, name, email, source) VALUES
    (demo_business_id, '+15559876543', 'John Smith', 'john@example.com', 'google'),
    (demo_business_id, '+15558765432', 'Sarah Johnson', 'sarah@example.com', 'referral'),
    (demo_business_id, '+15557654321', 'Mike Williams', null, 'missed_call');

  -- Create demo conversations with context
  INSERT INTO conversations (business_id, phone, status, context, last_message_at) VALUES
    (demo_business_id, '+15559876543', 'active', '{"intent":"service_inquiry","service":"water_heater"}'::jsonb, NOW() - INTERVAL '2 hours'),
    (demo_business_id, '+15558765432', 'active', '{"intent":"quote_request","service":"drain_cleaning"}'::jsonb, NOW() - INTERVAL '1 day'),
    (demo_business_id, '+15557654321', 'active', '{"intent":"missed_call_followup"}'::jsonb, NOW() - INTERVAL '30 minutes');

  -- Create demo messages
  WITH conv AS (SELECT id FROM conversations WHERE business_id = demo_business_id AND phone = '+15559876543' LIMIT 1)
  INSERT INTO messages (conversation_id, business_id, direction, content, ai_generated) VALUES
    ((SELECT id FROM conv), demo_business_id, 'inbound', 'Hi, my water heater is making strange noises. Can you help?', false),
    ((SELECT id FROM conv), demo_business_id, 'outbound', 'Hi! Thanks for reaching out to Demo Plumbing Co. Strange noises from a water heater can indicate sediment buildup or a failing heating element. Would you like to schedule a diagnostic visit? We have availability tomorrow between 9 AM and 2 PM.', true),
    ((SELECT id FROM conv), demo_business_id, 'inbound', 'Yes, 10 AM tomorrow works for me', false),
    ((SELECT id FROM conv), demo_business_id, 'outbound', 'Perfect! I''ve scheduled you for tomorrow at 10 AM. Our technician will arrive in a clearly marked van. The diagnostic fee is $75, which gets applied to any repair work. See you then!', true);

  -- Create demo invoices
  INSERT INTO invoices (business_id, contact_phone, contact_name, amount_cents, description, status, sent_at) VALUES
    (demo_business_id, '+15559876543', 'John Smith', 15000, 'Water heater diagnostic and minor repair', 'paid', NOW() - INTERVAL '1 week'),
    (demo_business_id, '+15558765432', 'Sarah Johnson', 25000, 'Drain cleaning service', 'sent', NOW() - INTERVAL '2 days'),
    (demo_business_id, '+15557654321', 'Mike Williams', 7500, 'Emergency call-out fee', 'pending', null);

  -- Create demo daily stats (last 7 days)
  INSERT INTO daily_stats (business_id, date, messages_sent, messages_received, missed_calls, new_leads, invoices_sent, invoices_paid, revenue_cents) VALUES
    (demo_business_id, CURRENT_DATE - 6, 12, 8, 2, 3, 1, 1, 15000),
    (demo_business_id, CURRENT_DATE - 5, 15, 10, 1, 2, 2, 0, 0),
    (demo_business_id, CURRENT_DATE - 4, 8, 6, 3, 4, 1, 2, 32500),
    (demo_business_id, CURRENT_DATE - 3, 20, 14, 0, 1, 0, 1, 7500),
    (demo_business_id, CURRENT_DATE - 2, 18, 12, 2, 3, 3, 1, 25000),
    (demo_business_id, CURRENT_DATE - 1, 10, 7, 1, 2, 1, 0, 0),
    (demo_business_id, CURRENT_DATE, 5, 3, 0, 1, 0, 0, 0);

  -- Create demo notifications
  INSERT INTO notifications (business_id, type, title, message, priority, is_read) VALUES
    (demo_business_id, 'insight', 'Response Time Improved!', 'Your average response time decreased to 2.3 minutes this week. Great job!', 'low', false),
    (demo_business_id, 'action', 'Invoice Follow-up Needed', 'Sarah Johnson''s invoice for $250 has been pending for 2 days.', 'medium', false),
    (demo_business_id, 'alert', 'New Lead from Google', 'Mike Williams called and we sent an automatic follow-up text.', 'high', true);

  RAISE NOTICE 'Demo data created successfully!';
  RAISE NOTICE 'Business ID: %', demo_business_id;
  RAISE NOTICE 'User ID: %', demo_user_id;
END $$;
