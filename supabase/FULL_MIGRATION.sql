-- ============================================
-- GhostOps Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 001: Initial Schema
-- ============================================

-- Businesses (Multi-tenant core)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  owner_email TEXT,
  owner_name TEXT,
  owner_phone TEXT UNIQUE,
  twilio_number TEXT UNIQUE,
  timezone TEXT DEFAULT 'America/New_York',
  stripe_customer_id TEXT,
  stripe_account_id TEXT,
  stripe_onboarded BOOLEAN DEFAULT FALSE,
  subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active',
  subscription_plan TEXT,
  subscription_current_period_end TIMESTAMPTZ,
  subscription_canceled_at TIMESTAMPTZ,
  onboarding_step TEXT DEFAULT 'welcome',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  meta_page_id TEXT,
  meta_access_token TEXT,
  instagram_account_id TEXT,
  google_place_id TEXT,
  brand_voice TEXT DEFAULT 'professional and friendly',
  business_type TEXT,
  services JSONB DEFAULT '[]',
  business_hours JSONB DEFAULT '{"mon":"9-5","tue":"9-5","wed":"9-5","thu":"9-5","fri":"9-5"}',
  features_enabled JSONB DEFAULT '{"missed_call_textback":true,"speed_to_lead":true,"review_engine":true,"sms_invoicing":true,"social_posting":true,"morning_briefing":true}',
  is_active BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts (CRM)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  source TEXT,
  tags JSONB DEFAULT '[]',
  notes TEXT,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  context JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  message_type TEXT DEFAULT 'sms',
  twilio_sid TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  service TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'sms',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL,
  line_items JSONB DEFAULT '[]',
  stripe_invoice_id TEXT,
  stripe_payment_link TEXT,
  stripe_hosted_url TEXT,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  reminder_3day_sent BOOLEAN DEFAULT FALSE,
  reminder_7day_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_id TEXT,
  author_name TEXT,
  rating INTEGER,
  content TEXT,
  response TEXT,
  response_ai_generated BOOLEAN DEFAULT FALSE,
  responded_at TIMESTAMPTZ,
  review_requested BOOLEAN DEFAULT FALSE,
  contact_phone TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Posts
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  processed_media_urls JSONB DEFAULT '[]',
  platforms JSONB DEFAULT '["instagram","facebook"]',
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  ai_options JSONB DEFAULT '[]',
  selected_option INTEGER,
  post_ids JSONB DEFAULT '{}',
  engagement JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  source TEXT NOT NULL,
  source_details JSONB DEFAULT '{}',
  received_at TIMESTAMPTZ DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  response_time_seconds INTEGER,
  status TEXT DEFAULT 'new',
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Missed Calls
CREATE TABLE IF NOT EXISTS missed_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  caller_phone TEXT NOT NULL,
  caller_name TEXT,
  twilio_call_sid TEXT,
  textback_sent BOOLEAN DEFAULT FALSE,
  textback_sent_at TIMESTAMPTZ,
  conversation_id UUID REFERENCES conversations(id),
  appointment_booked BOOLEAN DEFAULT FALSE,
  appointment_id UUID REFERENCES appointments(id),
  called_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Stats
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  missed_calls INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  invoices_sent INTEGER DEFAULT 0,
  invoices_paid INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  posts_published INTEGER DEFAULT 0,
  reviews_received INTEGER DEFAULT 0,
  avg_rating DECIMAL(2,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_business_phone ON contacts(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_invoices_business_status ON invoices(business_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(business_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments(business_id, scheduled_at);

-- ============================================
-- 002: Owner Conversations
-- ============================================

-- Owner conversations table (one per business)
CREATE TABLE IF NOT EXISTS owner_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_phone TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Owner messages table
CREATE TABLE IF NOT EXISTS owner_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_owner_messages_business_id ON owner_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_owner_messages_created_at ON owner_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_conversations_business_id ON owner_conversations(business_id);

-- RLS Policies
ALTER TABLE owner_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_messages ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (our backend uses service role key)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to owner_conversations') THEN
    CREATE POLICY "Service role full access to owner_conversations" ON owner_conversations FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to owner_messages') THEN
    CREATE POLICY "Service role full access to owner_messages" ON owner_messages FOR ALL USING (true);
  END IF;
END $$;

-- Updated_at trigger for owner_conversations
CREATE OR REPLACE FUNCTION update_owner_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_owner_conversation_updated_at ON owner_conversations;
CREATE TRIGGER trigger_owner_conversation_updated_at
  BEFORE UPDATE ON owner_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_owner_conversation_updated_at();

-- ============================================
-- Done! GhostOps schema is ready.
-- ============================================
