-- Migration: Usage Limits and Tracking
-- Created: 2026-02-17
-- Purpose: Add usage tracking and plan limits enforcement

-- Add plan limits columns to businesses table if not exists
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS plan_sms_limit INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS plan_ai_conversations_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS plan_phone_numbers_limit INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS plan_contacts_limit INTEGER DEFAULT 250;

-- Add usage tracking columns to daily_stats
ALTER TABLE daily_stats
ADD COLUMN IF NOT EXISTS ai_conversations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;

-- Create monthly usage summary table for billing
CREATE TABLE IF NOT EXISTS monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of the month
  sms_sent INTEGER DEFAULT 0,
  sms_received INTEGER DEFAULT 0,
  ai_conversations INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, month)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_monthly_usage_business_month ON monthly_usage(business_id, month);

-- Function to update plan limits based on subscription plan
CREATE OR REPLACE FUNCTION update_plan_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Update limits based on plan
  IF NEW.subscription_plan = 'starter' THEN
    NEW.plan_sms_limit := 100;
    NEW.plan_ai_conversations_limit := 50;
    NEW.plan_phone_numbers_limit := 1;
    NEW.plan_contacts_limit := 250;
  ELSIF NEW.subscription_plan = 'growth' THEN
    NEW.plan_sms_limit := 500;
    NEW.plan_ai_conversations_limit := 200;
    NEW.plan_phone_numbers_limit := 2;
    NEW.plan_contacts_limit := 2500;
  ELSIF NEW.subscription_plan = 'pro' THEN
    NEW.plan_sms_limit := 2000;
    NEW.plan_ai_conversations_limit := -1; -- unlimited
    NEW.plan_phone_numbers_limit := 5;
    NEW.plan_contacts_limit := -1; -- unlimited
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update limits when plan changes
DROP TRIGGER IF EXISTS trigger_update_plan_limits ON businesses;
CREATE TRIGGER trigger_update_plan_limits
  BEFORE UPDATE OF subscription_plan ON businesses
  FOR EACH ROW
  WHEN (OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan)
  EXECUTE FUNCTION update_plan_limits();

-- Function to get current month usage
CREATE OR REPLACE FUNCTION get_monthly_usage(p_business_id UUID)
RETURNS TABLE(
  sms_sent INTEGER,
  ai_conversations INTEGER,
  sms_limit INTEGER,
  ai_limit INTEGER,
  sms_remaining INTEGER,
  ai_remaining INTEGER
) AS $$
DECLARE
  v_month DATE;
  v_sms_sent INTEGER;
  v_ai_conversations INTEGER;
  v_sms_limit INTEGER;
  v_ai_limit INTEGER;
BEGIN
  v_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Get limits from business
  SELECT
    COALESCE(plan_sms_limit, 100),
    COALESCE(plan_ai_conversations_limit, 50)
  INTO v_sms_limit, v_ai_limit
  FROM businesses
  WHERE id = p_business_id;

  -- Get current usage
  SELECT
    COALESCE(mu.sms_sent, 0),
    COALESCE(mu.ai_conversations, 0)
  INTO v_sms_sent, v_ai_conversations
  FROM monthly_usage mu
  WHERE mu.business_id = p_business_id
    AND mu.month = v_month;

  -- Handle no usage record
  IF v_sms_sent IS NULL THEN
    v_sms_sent := 0;
    v_ai_conversations := 0;
  END IF;

  RETURN QUERY SELECT
    v_sms_sent,
    v_ai_conversations,
    v_sms_limit,
    v_ai_limit,
    CASE WHEN v_sms_limit = -1 THEN 999999 ELSE GREATEST(0, v_sms_limit - v_sms_sent) END,
    CASE WHEN v_ai_limit = -1 THEN 999999 ELSE GREATEST(0, v_ai_limit - v_ai_conversations) END;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage (returns false if limit exceeded)
CREATE OR REPLACE FUNCTION increment_usage(
  p_business_id UUID,
  p_type TEXT, -- 'sms' or 'ai'
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_month DATE;
  v_current_usage INTEGER;
  v_limit INTEGER;
BEGIN
  v_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Get limit
  IF p_type = 'sms' THEN
    SELECT COALESCE(plan_sms_limit, 100) INTO v_limit FROM businesses WHERE id = p_business_id;
  ELSIF p_type = 'ai' THEN
    SELECT COALESCE(plan_ai_conversations_limit, 50) INTO v_limit FROM businesses WHERE id = p_business_id;
  ELSE
    RETURN FALSE;
  END IF;

  -- Unlimited (-1) always succeeds
  IF v_limit = -1 THEN
    -- Still track usage
    INSERT INTO monthly_usage (business_id, month, sms_sent, ai_conversations)
    VALUES (p_business_id, v_month,
      CASE WHEN p_type = 'sms' THEN p_amount ELSE 0 END,
      CASE WHEN p_type = 'ai' THEN p_amount ELSE 0 END
    )
    ON CONFLICT (business_id, month) DO UPDATE SET
      sms_sent = CASE WHEN p_type = 'sms' THEN monthly_usage.sms_sent + p_amount ELSE monthly_usage.sms_sent END,
      ai_conversations = CASE WHEN p_type = 'ai' THEN monthly_usage.ai_conversations + p_amount ELSE monthly_usage.ai_conversations END,
      updated_at = NOW();
    RETURN TRUE;
  END IF;

  -- Get current usage
  SELECT CASE
    WHEN p_type = 'sms' THEN COALESCE(sms_sent, 0)
    ELSE COALESCE(ai_conversations, 0)
  END INTO v_current_usage
  FROM monthly_usage
  WHERE business_id = p_business_id AND month = v_month;

  IF v_current_usage IS NULL THEN
    v_current_usage := 0;
  END IF;

  -- Check limit
  IF v_current_usage + p_amount > v_limit THEN
    RETURN FALSE;
  END IF;

  -- Increment usage
  INSERT INTO monthly_usage (business_id, month, sms_sent, ai_conversations)
  VALUES (p_business_id, v_month,
    CASE WHEN p_type = 'sms' THEN p_amount ELSE 0 END,
    CASE WHEN p_type = 'ai' THEN p_amount ELSE 0 END
  )
  ON CONFLICT (business_id, month) DO UPDATE SET
    sms_sent = CASE WHEN p_type = 'sms' THEN monthly_usage.sms_sent + p_amount ELSE monthly_usage.sms_sent END,
    ai_conversations = CASE WHEN p_type = 'ai' THEN monthly_usage.ai_conversations + p_amount ELSE monthly_usage.ai_conversations END,
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- RLS policies for monthly_usage
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their usage"
  ON monthly_usage FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  ));

-- Service role can do everything
CREATE POLICY "Service role full access"
  ON monthly_usage FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON monthly_usage TO authenticated;
GRANT ALL ON monthly_usage TO service_role;
