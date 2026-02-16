import { NextRequest, NextResponse } from 'next/server'
import { recordFeedback } from '@/lib/cofounder/memory'
import { processFeedback } from '@/lib/cofounder/learning'

/**
 * POST /api/cofounder/memory/feedback
 * Record owner feedback on a decision and update learned preferences
 *
 * Body:
 * - decisionId: string (required)
 * - businessId: string (required)
 * - feedback: 'approved' | 'rejected' | 'modified' (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { decisionId, businessId, feedback } = body

    // Validate required fields
    if (!decisionId) {
      return NextResponse.json(
        { error: 'decisionId is required' },
        { status: 400 }
      )
    }

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    if (!feedback || !['approved', 'rejected', 'modified'].includes(feedback)) {
      return NextResponse.json(
        { error: 'feedback must be one of: approved, rejected, modified' },
        { status: 400 }
      )
    }

    // Record the feedback on the decision
    await recordFeedback(decisionId, feedback)

    // Process the feedback to update learned preferences
    const analysis = await processFeedback(businessId, decisionId, feedback)

    return NextResponse.json({
      success: true,
      message: `Feedback recorded: ${feedback}`,
      analysis: {
        patternsDetected: analysis.patternsDetected.length,
        preferencesUpdated: analysis.preferencesUpdated.length,
        details: analysis.preferencesUpdated
      }
    })

  } catch (error) {
    console.error('Feedback API error:', error)

    // Handle specific error cases
    if (error instanceof Error && error.message === 'Decision not found') {
      return NextResponse.json(
        { error: 'Decision not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    )
  }
}
