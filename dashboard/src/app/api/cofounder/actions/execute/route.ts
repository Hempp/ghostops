import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  executeAction,
  getActionById,
  getPendingActions,
  type CoFounderAction,
  type ExecutionResult
} from '@/lib/cofounder/actions'

// Lazy initialization
let supabase: SupabaseClient | null = null

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

// POST /api/cofounder/actions/execute - Execute approved actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { actionId, actionIds, businessId, executeAll } = body

    const results: Array<{
      actionId: string
      success: boolean
      result?: ExecutionResult
      error?: string
    }> = []

    // Execute a single action
    if (actionId) {
      const action = await getActionById(actionId)

      if (!action) {
        return NextResponse.json(
          { error: 'Action not found' },
          { status: 404 }
        )
      }

      if (action.status !== 'approved') {
        return NextResponse.json(
          { error: 'Action must be approved before execution' },
          { status: 400 }
        )
      }

      try {
        const result = await executeAction(actionId)

        // Log the execution
        await logExecution(action, result)

        return NextResponse.json({
          message: 'Action executed',
          actionId,
          result
        })
      } catch (error) {
        return NextResponse.json({
          message: 'Action execution failed',
          actionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // Execute multiple specific actions
    if (actionIds && Array.isArray(actionIds)) {
      for (const id of actionIds) {
        try {
          const action = await getActionById(id)

          if (!action) {
            results.push({ actionId: id, success: false, error: 'Action not found' })
            continue
          }

          if (action.status !== 'approved') {
            results.push({ actionId: id, success: false, error: 'Action not approved' })
            continue
          }

          const result = await executeAction(id)
          await logExecution(action, result)

          results.push({ actionId: id, success: result.success, result })
        } catch (error) {
          results.push({
            actionId: id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      return NextResponse.json({
        message: `Executed ${successCount}/${results.length} actions`,
        results
      })
    }

    // Execute all approved actions for a business
    if (executeAll && businessId) {
      const approvedActions = await getPendingActions(businessId, {
        status: 'approved',
        limit: 50 // Safety limit
      })

      if (approvedActions.length === 0) {
        return NextResponse.json({
          message: 'No approved actions to execute',
          results: []
        })
      }

      for (const action of approvedActions) {
        try {
          const result = await executeAction(action.id)
          await logExecution(action, result)

          results.push({ actionId: action.id, success: result.success, result })
        } catch (error) {
          results.push({
            actionId: action.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      return NextResponse.json({
        message: `Executed ${successCount}/${results.length} actions`,
        results
      })
    }

    return NextResponse.json(
      { error: 'Must provide actionId, actionIds, or executeAll with businessId' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Execute actions error:', error)
    return NextResponse.json(
      { error: 'Failed to execute actions' },
      { status: 500 }
    )
  }
}

// GET /api/cofounder/actions/execute - Get execution history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const limit = searchParams.get('limit') || '50'
    const actionType = searchParams.get('type')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing businessId parameter' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    let query = db
      .from('cofounder_action_logs')
      .select('*')
      .eq('business_id', businessId)
      .order('executed_at', { ascending: false })
      .limit(parseInt(limit, 10))

    if (actionType) {
      query = query.eq('action_type', actionType)
    }

    const { data: logs, error } = await query

    if (error) {
      // Table might not exist yet - return empty array
      if (error.code === '42P01') {
        return NextResponse.json({
          logs: [],
          message: 'Execution log table not yet created'
        })
      }
      throw error
    }

    // Also get executed actions for fuller picture
    const { data: executedActions } = await db
      .from('cofounder_actions')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'executed')
      .order('executed_at', { ascending: false })
      .limit(parseInt(limit, 10))

    return NextResponse.json({
      logs: logs || [],
      executedActions: executedActions || []
    })
  } catch (error) {
    console.error('Error fetching execution history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch execution history' },
      { status: 500 }
    )
  }
}

// Helper function to log executions
async function logExecution(
  action: CoFounderAction,
  result: ExecutionResult
): Promise<void> {
  const db = getSupabase()

  try {
    // Try to insert into execution log table
    await db.from('cofounder_action_logs').insert({
      id: crypto.randomUUID(),
      action_id: action.id,
      business_id: action.business_id,
      action_type: action.type,
      action_details: action.details,
      execution_result: result,
      executed_at: result.timestamp,
      success: result.success
    })
  } catch (error) {
    // Log table might not exist - that's OK, main action table has the result
    console.log('Execution log insert failed (table may not exist):', error)
  }
}

// Utility endpoint to retry a failed action
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { actionId } = body

    if (!actionId) {
      return NextResponse.json(
        { error: 'Missing actionId' },
        { status: 400 }
      )
    }

    const action = await getActionById(actionId)

    if (!action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      )
    }

    // Only retry failed executions (status is still approved with failed result)
    if (action.status !== 'approved') {
      return NextResponse.json(
        { error: 'Can only retry approved actions that failed execution' },
        { status: 400 }
      )
    }

    // Execute the action
    const result = await executeAction(actionId)
    await logExecution(action, result)

    return NextResponse.json({
      message: result.success ? 'Action retry successful' : 'Action retry failed',
      actionId,
      result
    })
  } catch (error) {
    console.error('Retry action error:', error)
    return NextResponse.json(
      { error: 'Failed to retry action' },
      { status: 500 }
    )
  }
}
