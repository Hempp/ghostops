import { NextRequest, NextResponse } from 'next/server'
import {
  getDecisionHistory,
  getLearnedPreferences,
  DecisionFilters
} from '@/lib/cofounder/memory'
import { generateLearningInsights } from '@/lib/cofounder/learning'

/**
 * GET /api/cofounder/memory
 * Fetch decision history with optional filters
 *
 * Query params:
 * - businessId: string (required)
 * - type: string (optional) - filter by decision type
 * - feedback: 'approved' | 'rejected' | 'modified' | 'pending' (optional)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - limit: number (optional, default 50)
 * - offset: number (optional, default 0)
 * - include: 'preferences' | 'insights' (optional) - additional data to include
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const businessId = searchParams.get('businessId')
    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const include = searchParams.get('include')

    // If requesting preferences only
    if (include === 'preferences') {
      const preferences = await getLearnedPreferences(businessId)
      return NextResponse.json({ preferences })
    }

    // If requesting insights only
    if (include === 'insights') {
      const insights = await generateLearningInsights(businessId)
      return NextResponse.json({ insights })
    }

    // Build filters for decision history
    const filters: DecisionFilters = {}

    const type = searchParams.get('type')
    if (type) filters.type = type

    const feedback = searchParams.get('feedback') as DecisionFilters['feedback']
    if (feedback) filters.feedback = feedback

    const startDate = searchParams.get('startDate')
    if (startDate) filters.startDate = new Date(startDate)

    const endDate = searchParams.get('endDate')
    if (endDate) filters.endDate = new Date(endDate)

    const limit = searchParams.get('limit')
    filters.limit = limit ? parseInt(limit, 10) : 50

    const offset = searchParams.get('offset')
    if (offset) filters.offset = parseInt(offset, 10)

    // Fetch decision history
    const decisions = await getDecisionHistory(businessId, filters)

    // Optionally include preferences and insights
    let preferences = undefined
    let insights = undefined

    if (searchParams.get('includePreferences') === 'true') {
      preferences = await getLearnedPreferences(businessId)
    }

    if (searchParams.get('includeInsights') === 'true') {
      insights = await generateLearningInsights(businessId)
    }

    return NextResponse.json({
      decisions,
      total: decisions.length,
      ...(preferences && { preferences }),
      ...(insights && { insights })
    })

  } catch (error) {
    console.error('Memory API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memory data' },
      { status: 500 }
    )
  }
}
