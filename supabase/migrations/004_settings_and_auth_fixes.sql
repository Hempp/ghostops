-- Migration: Settings column and auth fixes
-- Created: 2026-02-16
-- Description: Adds settings column to businesses, fixes auth trigger, adds UPDATE RLS policy

-- ============================================================================
-- 1. Add settings JSONB column to businesses table
-- ============================================================================
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN businesses.settings IS 'User preferences: notifications, appearance settings';

-- ============================================================================
-- 2. Fix handle_new_user trigger to handle NULL full_name
-- ============================================================================
-- The original trigger failed when full_name was not provided in user_metadata.
-- This version uses COALESCE to fall back to email prefix if full_name is NULL.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Add UPDATE policy for businesses table
-- ============================================================================
-- Allows business owners and admins to update their business settings

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'businesses'
    AND policyname = 'Users can update their businesses'
  ) THEN
    CREATE POLICY "Users can update their businesses"
    ON businesses
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM business_users
        WHERE business_users.business_id = businesses.id
        AND business_users.user_id = auth.uid()
        AND business_users.role IN ('owner', 'admin')
      )
    );
  END IF;
END $$;

-- ============================================================================
-- 4. Ensure RLS is enabled on businesses table
-- ============================================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
