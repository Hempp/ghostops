-- Migration: Autonomous Co-Founder System Tables
-- Created: 2026-02-16
-- Description: Tables for the 24/7 autonomous AI Co-Founder system

-- ============================================================================
-- 1. Notifications table - Real-time alerts and messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'new_lead', 'payment_received', 'payment_overdue', 'missed_call', 'cofounder_insight', 'daily_briefing', 'action_required', 'alert'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT DEFAULT 'in_app', -- 'in_app', 'sms', 'email', 'push'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'read'
  metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_business ON notifications(business_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = notifications.business_id
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business notifications"
  ON notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = notifications.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. Queued Actions - Actions pending approval/execution
-- ============================================================================
CREATE TABLE IF NOT EXISTS queued_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'payment_reminder', 'lead_response', 'review_reply', 'schedule_optimization', 'alert'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'executed', 'rejected'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  reasoning TEXT, -- AI explanation of why this action is suggested
  details JSONB NOT NULL DEFAULT '{}', -- Action-specific data (recipient, message, etc.)
  target_id UUID, -- Reference to invoice, contact, review, etc.
  target_type TEXT, -- 'invoice', 'contact', 'review', 'conversation'
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ,
  execution_result JSONB,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queued_actions_business ON queued_actions(business_id);
CREATE INDEX idx_queued_actions_status ON queued_actions(status);
CREATE INDEX idx_queued_actions_type ON queued_actions(type);
CREATE INDEX idx_queued_actions_created ON queued_actions(created_at DESC);

-- RLS for queued_actions
ALTER TABLE queued_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business actions"
  ON queued_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = queued_actions.business_id
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business actions"
  ON queued_actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = queued_actions.business_id
      AND business_users.user_id = auth.uid()
      AND business_users.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 3. Daily Briefings - Morning business summaries
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  summary TEXT NOT NULL, -- AI-generated summary
  metrics JSONB NOT NULL DEFAULT '{}', -- Key metrics for the day
  priorities JSONB DEFAULT '[]', -- Today's priorities
  opportunities JSONB DEFAULT '[]', -- Detected opportunities
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  UNIQUE(business_id, date)
);

CREATE INDEX idx_daily_briefings_business ON daily_briefings(business_id);
CREATE INDEX idx_daily_briefings_date ON daily_briefings(date DESC);

-- RLS for daily_briefings
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business briefings"
  ON daily_briefings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = daily_briefings.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. Weekly Strategy Reports - Strategic analysis and recommendations
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_strategy_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  performance_score INTEGER, -- 0-100 overall score
  metrics JSONB NOT NULL DEFAULT '{}', -- Week's metrics with comparisons
  what_worked JSONB DEFAULT '[]', -- Things that went well
  areas_to_improve JSONB DEFAULT '[]', -- Things to improve
  recommendations JSONB DEFAULT '[]', -- Strategic recommendations
  goal_adjustments JSONB DEFAULT '[]', -- Suggested goal changes
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  UNIQUE(business_id, week_start)
);

CREATE INDEX idx_weekly_reports_business ON weekly_strategy_reports(business_id);
CREATE INDEX idx_weekly_reports_week ON weekly_strategy_reports(week_start DESC);

-- RLS for weekly_strategy_reports
ALTER TABLE weekly_strategy_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business reports"
  ON weekly_strategy_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = weekly_strategy_reports.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. Co-Founder Decisions - Decision log for learning
-- ============================================================================
CREATE TABLE IF NOT EXISTS cofounder_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'message_response', 'invoice_creation', 'lead_followup', 'pricing_suggestion', 'scheduling', 'marketing'
  context JSONB NOT NULL DEFAULT '{}', -- What triggered this decision
  decision TEXT NOT NULL, -- What was decided
  reasoning TEXT, -- AI reasoning
  outcome TEXT, -- Result after execution
  owner_feedback TEXT, -- 'approved', 'rejected', 'modified'
  feedback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cofounder_decisions_business ON cofounder_decisions(business_id);
CREATE INDEX idx_cofounder_decisions_type ON cofounder_decisions(type);
CREATE INDEX idx_cofounder_decisions_feedback ON cofounder_decisions(owner_feedback);
CREATE INDEX idx_cofounder_decisions_created ON cofounder_decisions(created_at DESC);

-- RLS for cofounder_decisions
ALTER TABLE cofounder_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business decisions"
  ON cofounder_decisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_decisions.business_id
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business decisions"
  ON cofounder_decisions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_decisions.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. Co-Founder Preferences - Learned preferences from feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS cofounder_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'communication_style', 'timing', 'pricing', 'tone', 'urgency_threshold'
  preference TEXT NOT NULL, -- The learned preference
  confidence DECIMAL(3,2) DEFAULT 0.5, -- 0-1, increases with consistent feedback
  examples JSONB DEFAULT '[]', -- Examples that led to this preference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, category, preference)
);

CREATE INDEX idx_cofounder_preferences_business ON cofounder_preferences(business_id);
CREATE INDEX idx_cofounder_preferences_category ON cofounder_preferences(category);
CREATE INDEX idx_cofounder_preferences_confidence ON cofounder_preferences(confidence DESC);

-- RLS for cofounder_preferences
ALTER TABLE cofounder_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business preferences"
  ON cofounder_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_preferences.business_id
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business preferences"
  ON cofounder_preferences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_preferences.business_id
      AND business_users.user_id = auth.uid()
      AND business_users.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 7. Business Goals - Goal tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'revenue', -- 'revenue', 'customers', 'operations', 'growth'
  metric_type TEXT NOT NULL, -- 'currency', 'count', 'percentage'
  target_value DECIMAL(12,2) NOT NULL,
  current_value DECIMAL(12,2) DEFAULT 0,
  start_date DATE,
  target_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'archived'
  trend TEXT DEFAULT 'stable', -- 'up', 'down', 'stable'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_goals_business ON business_goals(business_id);
CREATE INDEX idx_business_goals_status ON business_goals(status);
CREATE INDEX idx_business_goals_category ON business_goals(category);

-- RLS for business_goals
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business goals"
  ON business_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = business_goals.business_id
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business goals"
  ON business_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = business_goals.business_id
      AND business_users.user_id = auth.uid()
      AND business_users.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 8. Co-Founder Insights - Cached AI-generated insights
-- ============================================================================
CREATE TABLE IF NOT EXISTS cofounder_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'opportunity', 'warning', 'tip', 'seasonal', 'trend', 'benchmark'
  category TEXT, -- 'retention', 'upsell', 'referral', 'growth', 'cost', 'efficiency'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  potential_value INTEGER, -- Estimated value in cents
  suggested_action TEXT,
  confidence DECIMAL(3,2) DEFAULT 0.7,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  status TEXT DEFAULT 'active', -- 'active', 'dismissed', 'actioned'
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actioned_at TIMESTAMPTZ
);

CREATE INDEX idx_cofounder_insights_business ON cofounder_insights(business_id);
CREATE INDEX idx_cofounder_insights_type ON cofounder_insights(type);
CREATE INDEX idx_cofounder_insights_status ON cofounder_insights(status);
CREATE INDEX idx_cofounder_insights_created ON cofounder_insights(created_at DESC);

-- RLS for cofounder_insights
ALTER TABLE cofounder_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business insights"
  ON cofounder_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_insights.business_id
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business insights"
  ON cofounder_insights FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = cofounder_insights.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. Customer Health Scores - Cached health calculations
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  score INTEGER NOT NULL, -- 0-100
  risk_level TEXT NOT NULL, -- 'low', 'medium', 'high'
  factors JSONB DEFAULT '[]', -- Breakdown of score factors
  recommendation TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id)
);

CREATE INDEX idx_customer_health_business ON customer_health_scores(business_id);
CREATE INDEX idx_customer_health_score ON customer_health_scores(score);
CREATE INDEX idx_customer_health_risk ON customer_health_scores(risk_level);

-- RLS for customer_health_scores
ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business health scores"
  ON customer_health_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = customer_health_scores.business_id
      AND business_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Enable realtime for notifications
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================================
-- Update function for updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_cofounder_preferences_updated_at
  BEFORE UPDATE ON cofounder_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_goals_updated_at
  BEFORE UPDATE ON business_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
