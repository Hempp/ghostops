import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  generateBusinessInsights,
  calculateCustomerHealth,
  type CustomerHealthResult
} from '@/lib/cofounder/intelligence'

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

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000

interface CachedInsights {
  data: Awaited<ReturnType<typeof generateBusinessInsights>>
  generatedAt: number
}

// In-memory cache (for production, use Redis or similar)
const insightsCache = new Map<string, CachedInsights>()

/**
 * GET /api/cofounder/insights
 * Fetch latest insights for a business
 * Query params:
 *   - businessId: required
 *   - refresh: optional, force refresh if "true"
 *   - type: optional, specific insight type (opportunities, seasonal, goals)
 *   - contactId: optional, for customer health score
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const refresh = searchParams.get('refresh') === 'true'
    const type = searchParams.get('type')
    const contactId = searchParams.get('contactId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    // Handle customer health score request
    if (contactId) {
      try {
        const healthScore = await calculateCustomerHealth(contactId, businessId)
        return NextResponse.json({ healthScore })
      } catch (error) {
        console.error('Error calculating customer health:', error)
        return NextResponse.json(
          { error: 'Failed to calculate customer health score' },
          { status: 500 }
        )
      }
    }

    // Check cache first
    const cacheKey = `insights:${businessId}`
    const cached = insightsCache.get(cacheKey)
    const now = Date.now()

    // Return cached data if fresh and not force refreshing
    if (cached && !refresh && (now - cached.generatedAt) < CACHE_DURATION) {
      // Return specific type if requested
      if (type === 'opportunities') {
        return NextResponse.json({ opportunities: cached.data.opportunities })
      }
      if (type === 'seasonal') {
        return NextResponse.json({ seasonalInsights: cached.data.seasonalInsights })
      }
      if (type === 'goals') {
        return NextResponse.json({ goalProgress: cached.data.goalProgress })
      }

      return NextResponse.json({
        ...cached.data,
        cached: true,
        cacheAge: Math.round((now - cached.generatedAt) / 1000 / 60) // minutes
      })
    }

    // Generate fresh insights
    const insights = await generateBusinessInsights(businessId)

    // Update cache
    insightsCache.set(cacheKey, {
      data: insights,
      generatedAt: now
    })

    // Store in database for persistence
    const db = getSupabase()
    try {
      await db.from('business_insights_cache').upsert({
        business_id: businessId,
        insights: insights,
        generated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id'
      })
    } catch (err: any) {
      // Log but don't fail if cache table doesn't exist
      console.warn('Could not persist insights to database:', err?.message)
    }

    // Return specific type if requested
    if (type === 'opportunities') {
      return NextResponse.json({ opportunities: insights.opportunities })
    }
    if (type === 'seasonal') {
      return NextResponse.json({ seasonalInsights: insights.seasonalInsights })
    }
    if (type === 'goals') {
      return NextResponse.json({ goalProgress: insights.goalProgress })
    }

    return NextResponse.json({
      ...insights,
      cached: false
    })
  } catch (error) {
    console.error('Error fetching insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cofounder/insights
 * Force regenerate insights (useful for webhooks/events)
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    // Clear cache
    insightsCache.delete(`insights:${businessId}`)

    // Generate fresh insights
    const insights = await generateBusinessInsights(businessId)

    // Update cache
    insightsCache.set(`insights:${businessId}`, {
      data: insights,
      generatedAt: Date.now()
    })

    // Store in database
    const db = getSupabase()
    try {
      await db.from('business_insights_cache').upsert({
        business_id: businessId,
        insights: insights,
        generated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id'
      })
    } catch (err: any) {
      console.warn('Could not persist insights to database:', err?.message)
    }

    return NextResponse.json({
      success: true,
      ...insights
    })
  } catch (error) {
    console.error('Error regenerating insights:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate insights' },
      { status: 500 }
    )
  }
}
