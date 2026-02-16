import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Initialize Supabase client lazily
let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

// ============================================================================
// Types
// ============================================================================

export interface Decision {
  id: string
  businessId: string
  type: string
  context: Record<string, unknown>  // What triggered this
  decision: string                   // What was decided
  reasoning: string                  // AI reasoning
  outcome?: string                   // Result after execution
  ownerFeedback?: 'approved' | 'rejected' | 'modified'
  createdAt: Date
}

export interface LearnedPreference {
  id: string
  businessId: string
  category: string     // 'communication_style', 'timing', 'pricing', etc.
  preference: string
  confidence: number   // 0-1, increases with consistent feedback
  examples: string[]
  createdAt: Date
  updatedAt: Date
}

export interface DecisionFilters {
  type?: string
  startDate?: Date
  endDate?: Date
  feedback?: 'approved' | 'rejected' | 'modified' | 'pending'
  limit?: number
  offset?: number
}

// Database row types (snake_case)
interface DecisionRow {
  id: string
  business_id: string
  type: string
  context: Record<string, unknown>
  decision: string
  reasoning: string
  outcome?: string
  owner_feedback?: 'approved' | 'rejected' | 'modified'
  created_at: string
}

interface PreferenceRow {
  id: string
  business_id: string
  category: string
  preference: string
  confidence: number
  examples: string[]
  created_at: string
  updated_at: string
}

// ============================================================================
// Decision Functions
// ============================================================================

/**
 * Log a new decision made by the Co-Founder AI
 */
export async function logDecision(
  decision: Omit<Decision, 'id' | 'createdAt'>
): Promise<string> {
  const db = getSupabase()

  const { data, error } = await db
    .from('cofounder_decisions')
    .insert({
      business_id: decision.businessId,
      type: decision.type,
      context: decision.context,
      decision: decision.decision,
      reasoning: decision.reasoning,
      outcome: decision.outcome,
      owner_feedback: decision.ownerFeedback
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error logging decision:', error)
    throw new Error(`Failed to log decision: ${error.message}`)
  }

  return data.id
}

/**
 * Record the outcome of a decision after execution
 */
export async function recordOutcome(
  decisionId: string,
  outcome: string
): Promise<void> {
  const db = getSupabase()

  const { error } = await db
    .from('cofounder_decisions')
    .update({ outcome })
    .eq('id', decisionId)

  if (error) {
    console.error('Error recording outcome:', error)
    throw new Error(`Failed to record outcome: ${error.message}`)
  }
}

/**
 * Record owner feedback on a decision
 */
export async function recordFeedback(
  decisionId: string,
  feedback: 'approved' | 'rejected' | 'modified'
): Promise<void> {
  const db = getSupabase()

  const { error } = await db
    .from('cofounder_decisions')
    .update({ owner_feedback: feedback })
    .eq('id', decisionId)

  if (error) {
    console.error('Error recording feedback:', error)
    throw new Error(`Failed to record feedback: ${error.message}`)
  }
}

/**
 * Get decision history for a business with optional filters
 */
export async function getDecisionHistory(
  businessId: string,
  filters: DecisionFilters = {}
): Promise<Decision[]> {
  const db = getSupabase()

  let query = db
    .from('cofounder_decisions')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString())
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString())
  }

  if (filters.feedback) {
    if (filters.feedback === 'pending') {
      query = query.is('owner_feedback', null)
    } else {
      query = query.eq('owner_feedback', filters.feedback)
    }
  }

  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching decision history:', error)
    throw new Error(`Failed to fetch decision history: ${error.message}`)
  }

  return (data as DecisionRow[]).map(rowToDecision)
}

/**
 * Get a single decision by ID
 */
export async function getDecision(decisionId: string): Promise<Decision | null> {
  const db = getSupabase()

  const { data, error } = await db
    .from('cofounder_decisions')
    .select('*')
    .eq('id', decisionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('Error fetching decision:', error)
    throw new Error(`Failed to fetch decision: ${error.message}`)
  }

  return rowToDecision(data as DecisionRow)
}

// ============================================================================
// Preference Functions
// ============================================================================

/**
 * Get all learned preferences for a business
 */
export async function getLearnedPreferences(
  businessId: string
): Promise<LearnedPreference[]> {
  const db = getSupabase()

  const { data, error } = await db
    .from('cofounder_preferences')
    .select('*')
    .eq('business_id', businessId)
    .order('confidence', { ascending: false })

  if (error) {
    console.error('Error fetching preferences:', error)
    throw new Error(`Failed to fetch preferences: ${error.message}`)
  }

  return (data as PreferenceRow[]).map(rowToPreference)
}

/**
 * Get preferences by category
 */
export async function getPreferencesByCategory(
  businessId: string,
  category: string
): Promise<LearnedPreference[]> {
  const db = getSupabase()

  const { data, error } = await db
    .from('cofounder_preferences')
    .select('*')
    .eq('business_id', businessId)
    .eq('category', category)
    .order('confidence', { ascending: false })

  if (error) {
    console.error('Error fetching preferences by category:', error)
    throw new Error(`Failed to fetch preferences: ${error.message}`)
  }

  return (data as PreferenceRow[]).map(rowToPreference)
}

/**
 * Update or create a preference
 */
export async function updatePreference(
  businessId: string,
  category: string,
  preference: string,
  confidence?: number,
  examples?: string[]
): Promise<void> {
  const db = getSupabase()

  // Check if preference already exists for this category
  const { data: existing } = await db
    .from('cofounder_preferences')
    .select('id, confidence, examples')
    .eq('business_id', businessId)
    .eq('category', category)
    .eq('preference', preference)
    .single()

  if (existing) {
    // Update existing preference
    const newConfidence = confidence ?? Math.min(existing.confidence + 0.1, 1.0)
    const newExamples = examples
      ? [...(existing.examples || []), ...examples].slice(-10) // Keep last 10 examples
      : existing.examples

    const { error } = await db
      .from('cofounder_preferences')
      .update({
        confidence: newConfidence,
        examples: newExamples,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating preference:', error)
      throw new Error(`Failed to update preference: ${error.message}`)
    }
  } else {
    // Create new preference
    const { error } = await db
      .from('cofounder_preferences')
      .insert({
        business_id: businessId,
        category,
        preference,
        confidence: confidence ?? 0.3, // Start with low confidence
        examples: examples || []
      })

    if (error) {
      console.error('Error creating preference:', error)
      throw new Error(`Failed to create preference: ${error.message}`)
    }
  }
}

/**
 * Decrease confidence in a preference (when feedback contradicts it)
 */
export async function decreasePreferenceConfidence(
  preferenceId: string,
  amount: number = 0.2
): Promise<void> {
  const db = getSupabase()

  const { data: existing, error: fetchError } = await db
    .from('cofounder_preferences')
    .select('confidence')
    .eq('id', preferenceId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch preference: ${fetchError.message}`)
  }

  const newConfidence = Math.max(existing.confidence - amount, 0)

  // If confidence drops to 0, delete the preference
  if (newConfidence === 0) {
    const { error } = await db
      .from('cofounder_preferences')
      .delete()
      .eq('id', preferenceId)

    if (error) {
      throw new Error(`Failed to delete preference: ${error.message}`)
    }
  } else {
    const { error } = await db
      .from('cofounder_preferences')
      .update({
        confidence: newConfidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', preferenceId)

    if (error) {
      throw new Error(`Failed to update preference: ${error.message}`)
    }
  }
}

/**
 * Delete (forget) a specific preference
 */
export async function forgetPreference(preferenceId: string): Promise<void> {
  const db = getSupabase()

  const { error } = await db
    .from('cofounder_preferences')
    .delete()
    .eq('id', preferenceId)

  if (error) {
    console.error('Error deleting preference:', error)
    throw new Error(`Failed to delete preference: ${error.message}`)
  }
}

/**
 * Reset all preferences for a category
 */
export async function resetCategoryPreferences(
  businessId: string,
  category: string
): Promise<void> {
  const db = getSupabase()

  const { error } = await db
    .from('cofounder_preferences')
    .delete()
    .eq('business_id', businessId)
    .eq('category', category)

  if (error) {
    console.error('Error resetting preferences:', error)
    throw new Error(`Failed to reset preferences: ${error.message}`)
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function rowToDecision(row: DecisionRow): Decision {
  return {
    id: row.id,
    businessId: row.business_id,
    type: row.type,
    context: row.context,
    decision: row.decision,
    reasoning: row.reasoning,
    outcome: row.outcome,
    ownerFeedback: row.owner_feedback,
    createdAt: new Date(row.created_at)
  }
}

function rowToPreference(row: PreferenceRow): LearnedPreference {
  return {
    id: row.id,
    businessId: row.business_id,
    category: row.category,
    preference: row.preference,
    confidence: row.confidence,
    examples: row.examples || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

// ============================================================================
// Decision Type Constants
// ============================================================================

export const DECISION_TYPES = {
  MESSAGE_RESPONSE: 'message_response',
  INVOICE_CREATION: 'invoice_creation',
  LEAD_FOLLOWUP: 'lead_followup',
  PRICING_SUGGESTION: 'pricing_suggestion',
  SCHEDULING: 'scheduling',
  MARKETING: 'marketing',
  CUSTOMER_SERVICE: 'customer_service',
  STRATEGIC: 'strategic',
  OPERATIONAL: 'operational'
} as const

export const PREFERENCE_CATEGORIES = {
  COMMUNICATION_STYLE: 'communication_style',
  TIMING: 'timing',
  PRICING: 'pricing',
  TONE: 'tone',
  URGENCY_THRESHOLD: 'urgency_threshold',
  FOLLOW_UP_FREQUENCY: 'follow_up_frequency',
  RESPONSE_LENGTH: 'response_length',
  FORMALITY: 'formality',
  AUTOMATION_LEVEL: 'automation_level'
} as const

export type DecisionType = typeof DECISION_TYPES[keyof typeof DECISION_TYPES]
export type PreferenceCategory = typeof PREFERENCE_CATEGORIES[keyof typeof PREFERENCE_CATEGORIES]
