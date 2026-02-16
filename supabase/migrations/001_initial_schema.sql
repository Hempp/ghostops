-- GhostOps Database Schema - SUPA-MASTER Architecture
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Businesses (Multi-tenant core)
CREATE TABLE businesses (
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
CREATE TABLE contacts (
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
CREATE TABLE conversations (
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
CREATE TABLE messages (
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
CREATE TABLE appointments (
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
CREATE TABLE invoices (
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
CREATE TABLE reviews (
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
CREATE TABLE social_posts (
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
CREATE TABLE leads (
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
CREATE TABLE missed_calls (
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
CREATE TABLE daily_stats (
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
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_conversations_business ON conversations(business_id);
CREATE INDEX idx_contacts_business_phone ON contacts(business_id, phone);
CREATE INDEX idx_invoices_business_status ON invoices(business_id, status);
CREATE INDEX idx_leads_business ON leads(business_id, status);
CREATE INDEX idx_appointments_business ON appointments(business_id, scheduled_at);
