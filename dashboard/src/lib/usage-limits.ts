/**
 * Usage Limits Service
 * Enforces plan-based usage limits for SMS, AI conversations, etc.
 */

import { createClient } from '@supabase/supabase-js'

// Plan limits configuration (mirrors database defaults)
export const PLAN_LIMITS = {
  starter: {
    smsLimit: 100,
    aiConversations: 50,
    phoneNumbers: 1,
    contacts: 250,
  },
  growth: {
    smsLimit: 500,
    aiConversations: 200,
    phoneNumbers: 2,
    contacts: 2500,
  },
  pro: {
    smsLimit: 2000,
    aiConversations: -1, // unlimited
    phoneNumbers: 5,
    contacts: -1, // unlimited
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS

export interface UsageStatus {
  sms_sent: number
  ai_conversations: number
  sms_limit: number
  ai_limit: number
  sms_remaining: number
  ai_remaining: number
}

export interface UsageCheckResult {
  allowed: boolean
  currentUsage: number
  limit: number
  remaining: number
  message?: string
}

// Get Supabase client with service role
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase credentials not configured')
  }

  return createClient(url, key)
}

/**
 * Get current monthly usage for a business
 */
export async function getMonthlyUsage(businessId: string): Promise<UsageStatus | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase.rpc('get_monthly_usage', {
    p_business_id: businessId,
  })

  if (error) {
    console.error('Failed to get usage:', error)
    return null
  }

  // RPC returns array, get first row
  return data?.[0] || null
}

/**
 * Check if a usage type is within limits without incrementing
 */
export async function checkUsageLimit(
  businessId: string,
  type: 'sms' | 'ai',
  amount: number = 1
): Promise<UsageCheckResult> {
  const usage = await getMonthlyUsage(businessId)

  if (!usage) {
    // If we can't get usage, allow but log warning
    console.warn(`Could not get usage for business ${businessId}, allowing operation`)
    return {
      allowed: true,
      currentUsage: 0,
      limit: -1,
      remaining: 999999,
    }
  }

  const currentUsage = type === 'sms' ? usage.sms_sent : usage.ai_conversations
  const limit = type === 'sms' ? usage.sms_limit : usage.ai_limit
  const remaining = type === 'sms' ? usage.sms_remaining : usage.ai_remaining

  // Unlimited (-1) always allowed
  if (limit === -1) {
    return {
      allowed: true,
      currentUsage,
      limit: -1,
      remaining: 999999,
    }
  }

  const allowed = remaining >= amount

  return {
    allowed,
    currentUsage,
    limit,
    remaining,
    message: allowed
      ? undefined
      : `${type.toUpperCase()} limit reached. You've used ${currentUsage}/${limit} this month. Upgrade your plan for more.`,
  }
}

/**
 * Increment usage and check limits atomically
 * Returns true if allowed, false if limit exceeded
 */
export async function incrementUsage(
  businessId: string,
  type: 'sms' | 'ai',
  amount: number = 1
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase.rpc('increment_usage', {
    p_business_id: businessId,
    p_type: type,
    p_amount: amount,
  })

  if (error) {
    console.error('Failed to increment usage:', error)
    // On error, allow the operation but log it
    return true
  }

  return data === true
}

/**
 * Get plan limits for a subscription plan
 */
export function getPlanLimits(plan: string | null | undefined) {
  const normalizedPlan = (plan?.toLowerCase() || 'starter') as PlanType
  return PLAN_LIMITS[normalizedPlan] || PLAN_LIMITS.starter
}

/**
 * Format usage for display
 */
export function formatUsageDisplay(usage: UsageStatus): {
  sms: string
  ai: string
  smsPercent: number
  aiPercent: number
} {
  const smsPercent = usage.sms_limit === -1 ? 0 : Math.round((usage.sms_sent / usage.sms_limit) * 100)
  const aiPercent = usage.ai_limit === -1 ? 0 : Math.round((usage.ai_conversations / usage.ai_limit) * 100)

  return {
    sms: usage.sms_limit === -1 ? `${usage.sms_sent} sent` : `${usage.sms_sent}/${usage.sms_limit}`,
    ai: usage.ai_limit === -1 ? `${usage.ai_conversations} conversations` : `${usage.ai_conversations}/${usage.ai_limit}`,
    smsPercent: Math.min(smsPercent, 100),
    aiPercent: Math.min(aiPercent, 100),
  }
}

/**
 * Check if approaching limit (80% threshold)
 */
export function isApproachingLimit(usage: UsageStatus): {
  sms: boolean
  ai: boolean
} {
  const threshold = 0.8

  return {
    sms: usage.sms_limit !== -1 && usage.sms_sent >= usage.sms_limit * threshold,
    ai: usage.ai_limit !== -1 && usage.ai_conversations >= usage.ai_limit * threshold,
  }
}
