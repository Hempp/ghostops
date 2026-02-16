import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { trackGoalProgress } from '@/lib/cofounder/intelligence'

// Database types for business_goals table
interface BusinessGoalRow {
  id: string
  business_id: string
  name: string
  description: string | null
  metric_type: string
  target_value: number
  current_value: number
  unit: string
  deadline: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Initialize Supabase client lazily
let supabase: SupabaseClient<any> | null = null

function getSupabase(): SupabaseClient<any> {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

// Business goal interface
export interface BusinessGoal {
  id: string
  business_id: string
  name: string
  description?: string
  metric_type: 'revenue' | 'leads' | 'messages' | 'custom'
  target_value: number
  current_value: number
  unit: string
  deadline?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * GET /api/cofounder/goals
 * List business goals with progress tracking
 * Query params:
 *   - businessId: required
 *   - includeProgress: optional, include AI-generated progress analysis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const includeProgress = searchParams.get('includeProgress') === 'true'

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    // Fetch goals
    const { data: goals, error } = await db
      .from('business_goals')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist, return empty array with default suggestions
      if (error.code === '42P01') {
        console.warn('business_goals table does not exist')
        return NextResponse.json({
          goals: [],
          suggestedGoals: getSuggestedGoals()
        })
      }
      throw error
    }

    // Include progress analysis if requested
    if (includeProgress) {
      const progress = await trackGoalProgress(businessId)
      return NextResponse.json({
        goals: goals || [],
        progress
      })
    }

    return NextResponse.json({
      goals: goals || [],
      suggestedGoals: (goals || []).length === 0 ? getSuggestedGoals() : undefined
    })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cofounder/goals
 * Create a new business goal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, name, description, metricType, targetValue, unit, deadline } = body

    if (!businessId || !name || !targetValue) {
      return NextResponse.json(
        { error: 'businessId, name, and targetValue are required' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    // Create goal
    const { data: goal, error } = await db
      .from('business_goals')
      .insert({
        business_id: businessId,
        name,
        description,
        metric_type: metricType || 'custom',
        target_value: targetValue,
        current_value: 0,
        unit: unit || '',
        deadline: deadline || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      // If table doesn't exist, provide guidance
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'Goals feature not yet configured',
          migration: `
-- Run this migration to enable goals:
CREATE TABLE business_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metric_type VARCHAR(50) DEFAULT 'custom',
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit VARCHAR(50) DEFAULT '',
  deadline TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_business_goals_business ON business_goals(business_id);
          `.trim()
        }, { status: 501 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      goal
    })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/cofounder/goals
 * Update goal progress or properties
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { goalId, businessId, currentValue, targetValue, name, description, isActive, deadline } = body

    if (!goalId || !businessId) {
      return NextResponse.json(
        { error: 'goalId and businessId are required' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (currentValue !== undefined) updates.current_value = currentValue
    if (targetValue !== undefined) updates.target_value = targetValue
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (isActive !== undefined) updates.is_active = isActive
    if (deadline !== undefined) updates.deadline = deadline

    const { data: goal, error } = await db
      .from('business_goals')
      .update(updates)
      .eq('id', goalId)
      .eq('business_id', businessId) // Ensure user owns this goal
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      goal
    })
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cofounder/goals
 * Remove a goal (soft delete by setting is_active = false)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId')
    const businessId = searchParams.get('businessId')
    const hardDelete = searchParams.get('hard') === 'true'

    if (!goalId || !businessId) {
      return NextResponse.json(
        { error: 'goalId and businessId are required' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    if (hardDelete) {
      // Hard delete
      const { error } = await db
        .from('business_goals')
        .delete()
        .eq('id', goalId)
        .eq('business_id', businessId)

      if (error) throw error
    } else {
      // Soft delete
      const { error } = await db
        .from('business_goals')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', goalId)
        .eq('business_id', businessId)

      if (error) throw error
    }

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Goal deleted' : 'Goal archived'
    })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    )
  }
}

// Helper: Get suggested goals for new businesses
function getSuggestedGoals() {
  return [
    {
      name: 'Monthly Revenue',
      description: 'Track total revenue collected each month',
      metricType: 'revenue',
      suggestedTarget: 5000,
      unit: '$'
    },
    {
      name: 'New Leads per Month',
      description: 'Number of new customer inquiries',
      metricType: 'leads',
      suggestedTarget: 20,
      unit: 'leads'
    },
    {
      name: 'Response Rate',
      description: 'Percentage of messages responded to within 1 hour',
      metricType: 'custom',
      suggestedTarget: 90,
      unit: '%'
    },
    {
      name: 'Customer Reviews',
      description: 'Collect positive reviews from satisfied customers',
      metricType: 'custom',
      suggestedTarget: 10,
      unit: 'reviews'
    }
  ]
}
