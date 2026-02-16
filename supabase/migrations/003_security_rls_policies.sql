-- ============================================
-- GhostOps Security: Row Level Security Policies
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE missed_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Business Users Table (for user-business association)
-- ============================================
CREATE TABLE IF NOT EXISTS business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Service Role Policies (Backend access)
-- The backend uses service_role key which bypasses RLS
-- ============================================

-- ============================================
-- Authenticated User Policies (Dashboard access)
-- ============================================

-- Business Users: Users can only see their own associations
CREATE POLICY "Users can view own business associations"
  ON business_users FOR SELECT
  USING (auth.uid() = user_id);

-- Businesses: Users can only access businesses they belong to
CREATE POLICY "Users can view their businesses"
  ON businesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = businesses.id
      AND business_users.user_id = auth.uid()
    )
  );

-- Contacts: Business members can view contacts
CREATE POLICY "Business members can view contacts"
  ON contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = contacts.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Conversations: Business members can view conversations
CREATE POLICY "Business members can view conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = conversations.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Messages: Business members can view messages
CREATE POLICY "Business members can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = messages.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Appointments: Business members can view appointments
CREATE POLICY "Business members can view appointments"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = appointments.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Invoices: Business members can view invoices
CREATE POLICY "Business members can view invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = invoices.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Reviews: Business members can view reviews
CREATE POLICY "Business members can view reviews"
  ON reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = reviews.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Social Posts: Business members can view posts
CREATE POLICY "Business members can view social posts"
  ON social_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = social_posts.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Leads: Business members can view leads
CREATE POLICY "Business members can view leads"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = leads.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Missed Calls: Business members can view missed calls
CREATE POLICY "Business members can view missed calls"
  ON missed_calls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = missed_calls.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Daily Stats: Business members can view stats
CREATE POLICY "Business members can view daily stats"
  ON daily_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = daily_stats.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- ============================================
-- Storage Bucket Policies
-- ============================================

-- Create storage bucket for business media if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Only authenticated users can access their business media
CREATE POLICY "Business members can view media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id::text = (storage.foldername(name))[1]
      AND business_users.user_id = auth.uid()
    )
  );

-- ============================================
-- Indexes for RLS performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_business_users_user_id ON business_users(user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_business_id ON business_users(business_id);

-- ============================================
-- Done! RLS policies are now active.
-- ============================================
