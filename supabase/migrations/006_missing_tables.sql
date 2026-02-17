-- Migration: Missing Tables and RLS Policies
-- Created: 2026-02-16
-- Description: Adds cofounder_actions table, action logs, and missing RLS policies

-- ============================================================================
-- 1. Co-Founder Actions - AI-generated actions for business automation
-- ============================================================================
CREATE TABLE IF NOT EXISTS cofounder_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'payment_reminder', 'lead_response', 'review_reply', 'social_post', 'appointment_reminder', 'follow_up', etc.
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'rejected')),
  target_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  target_phone TEXT,
  content TEXT, -- The message/action content
  metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cofounder_actions
CREATE INDEX idx_cofounder_actions_business ON cofounder_actions(business_id);
CREATE INDEX idx_cofounder_actions_status ON cofounder_actions(status);
CREATE INDEX idx_cofounder_actions_type ON cofounder_actions(type);
CREATE INDEX idx_cofounder_actions_priority ON cofounder_actions(priority);
CREATE INDEX idx_cofounder_actions_scheduled ON cofounder_actions(scheduled_for);
CREATE INDEX idx_cofounder_actions_created ON cofounder_actions(created_at DESC);

-- Enable RLS
ALTER TABLE cofounder_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cofounder_actions
CREATE POLICY "Business members can view cofounder actions"
  ON cofounder_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_actions.business_id
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Business members can insert cofounder actions"
  ON cofounder_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_actions.business_id
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners/admins can update cofounder actions"
  ON cofounder_actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_actions.business_id
      AND business_users.user_id = auth.uid()
      AND business_users.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 2. Co-Founder Action Logs - Execution history for actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS cofounder_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES cofounder_actions(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  result JSONB DEFAULT '{}',
  error TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cofounder_action_logs
CREATE INDEX idx_cofounder_action_logs_action ON cofounder_action_logs(action_id);
CREATE INDEX idx_cofounder_action_logs_business ON cofounder_action_logs(business_id);
CREATE INDEX idx_cofounder_action_logs_status ON cofounder_action_logs(status);
CREATE INDEX idx_cofounder_action_logs_executed ON cofounder_action_logs(executed_at DESC);

-- Enable RLS
ALTER TABLE cofounder_action_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cofounder_action_logs
CREATE POLICY "Business members can view action logs"
  ON cofounder_action_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_action_logs.business_id
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Business members can insert action logs"
  ON cofounder_action_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_action_logs.business_id
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners/admins can update action logs"
  ON cofounder_action_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_action_logs.business_id
      AND business_users.user_id = auth.uid()
      AND business_users.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 3. Missing RLS Policies for Existing Tables
-- ============================================================================

-- Messages: INSERT policy for business users
CREATE POLICY "Business members can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = messages.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Conversations: UPDATE policy for business users
CREATE POLICY "Business members can update conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = conversations.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Contacts: INSERT policy for business users
CREATE POLICY "Business members can insert contacts"
  ON contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = contacts.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Contacts: UPDATE policy for business users
CREATE POLICY "Business members can update contacts"
  ON contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = contacts.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Invoices: INSERT policy for business users
CREATE POLICY "Business members can insert invoices"
  ON invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = invoices.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- Invoices: UPDATE policy for business users
CREATE POLICY "Business members can update invoices"
  ON invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = invoices.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Enable realtime for cofounder_actions (optional)
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE cofounder_actions;

-- ============================================================================
-- Done! Migration complete.
-- ============================================================================
