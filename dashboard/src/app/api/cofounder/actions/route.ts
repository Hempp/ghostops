import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  getPendingActions,
  getActionById,
  approveAction,
  rejectAction,
  bulkApproveActions,
  generatePaymentReminder,
  generateLeadResponse,
  generateReviewReply,
  generateAlert,
  scanForPendingPaymentReminders,
  getActionStats,
  type ActionType,
  type ActionStatus
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

// GET /api/cofounder/actions - List actions with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const type = searchParams.get('type') as ActionType | null
    const status = searchParams.get('status') as ActionStatus | null
    const priority = searchParams.get('priority')
    const limit = searchParams.get('limit')
    const includeStats = searchParams.get('includeStats') === 'true'

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing businessId parameter' },
        { status: 400 }
      )
    }

    // Fetch actions with filters
    const actions = await getPendingActions(businessId, {
      type: type || undefined,
      status: status || undefined,
      priority: priority || undefined,
      limit: limit ? parseInt(limit, 10) : undefined
    })

    // Optionally include stats
    let stats = null
    if (includeStats) {
      stats = await getActionStats(businessId)
    }

    return NextResponse.json({
      actions,
      stats,
      count: actions.length
    })
  } catch (error) {
    console.error('Error fetching actions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch actions' },
      { status: 500 }
    )
  }
}

// POST /api/cofounder/actions - Create new action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, type, ...data } = body

    if (!businessId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, type' },
        { status: 400 }
      )
    }

    const db = getSupabase()
    let action

    switch (type) {
      case 'payment_reminder': {
        if (!data.invoiceId) {
          return NextResponse.json(
            { error: 'Missing invoiceId for payment_reminder' },
            { status: 400 }
          )
        }

        // Fetch the invoice
        const { data: invoice, error } = await db
          .from('invoices')
          .select('*')
          .eq('id', data.invoiceId)
          .eq('business_id', businessId)
          .single()

        if (error || !invoice) {
          return NextResponse.json(
            { error: 'Invoice not found' },
            { status: 404 }
          )
        }

        // Get business name for context
        const { data: business } = await db
          .from('businesses')
          .select('name')
          .eq('id', businessId)
          .single()

        action = await generatePaymentReminder(invoice, business?.name)
        break
      }

      case 'lead_response': {
        if (!data.contactId) {
          return NextResponse.json(
            { error: 'Missing contactId for lead_response' },
            { status: 400 }
          )
        }

        // Fetch the contact
        const { data: contact, error } = await db
          .from('contacts')
          .select('*')
          .eq('id', data.contactId)
          .eq('business_id', businessId)
          .single()

        if (error || !contact) {
          return NextResponse.json(
            { error: 'Contact not found' },
            { status: 404 }
          )
        }

        // Optionally fetch conversation
        let conversation = null
        if (data.conversationId) {
          const { data: conv } = await db
            .from('conversations')
            .select('*')
            .eq('id', data.conversationId)
            .single()
          conversation = conv
        }

        // Fetch recent messages if conversation exists
        let recentMessages: string[] = []
        if (conversation) {
          const { data: messages } = await db
            .from('messages')
            .select('content, direction')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(5)

          recentMessages = messages?.map(m =>
            `${m.direction === 'inbound' ? 'Customer' : 'Business'}: ${m.content}`
          ) || []
        }

        action = await generateLeadResponse(contact, conversation, recentMessages)
        break
      }

      case 'review_reply': {
        if (!data.reviewId) {
          return NextResponse.json(
            { error: 'Missing reviewId for review_reply' },
            { status: 400 }
          )
        }

        // Fetch the review
        const { data: review, error } = await db
          .from('reviews')
          .select('*')
          .eq('id', data.reviewId)
          .eq('business_id', businessId)
          .single()

        if (error || !review) {
          return NextResponse.json(
            { error: 'Review not found' },
            { status: 404 }
          )
        }

        // Get business name
        const { data: business } = await db
          .from('businesses')
          .select('name')
          .eq('id', businessId)
          .single()

        action = await generateReviewReply(review, business?.name)
        break
      }

      case 'alert': {
        if (!data.category || !data.message) {
          return NextResponse.json(
            { error: 'Missing category or message for alert' },
            { status: 400 }
          )
        }

        action = await generateAlert(businessId, data.category, data.message, data.data)
        break
      }

      case 'scan_reminders': {
        // Special action to scan for all overdue invoices and generate reminders
        const newActions = await scanForPendingPaymentReminders(businessId)
        return NextResponse.json({
          message: `Generated ${newActions.length} payment reminder actions`,
          actions: newActions
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action type: ${type}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: 'Action created successfully',
      action
    })
  } catch (error) {
    console.error('Error creating action:', error)
    return NextResponse.json(
      { error: 'Failed to create action' },
      { status: 500 }
    )
  }
}

// PATCH /api/cofounder/actions - Approve/reject action
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { actionId, actionIds, status, details } = body

    // Handle bulk operations
    if (actionIds && Array.isArray(actionIds)) {
      if (status === 'approved') {
        await bulkApproveActions(actionIds)
        return NextResponse.json({
          message: `${actionIds.length} actions approved`,
          actionIds
        })
      }

      // Bulk reject
      if (status === 'rejected') {
        const db = getSupabase()
        await db
          .from('cofounder_actions')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString()
          })
          .in('id', actionIds)

        return NextResponse.json({
          message: `${actionIds.length} actions rejected`,
          actionIds
        })
      }
    }

    // Single action operation
    if (!actionId) {
      return NextResponse.json(
        { error: 'Missing actionId' },
        { status: 400 }
      )
    }

    // Verify action exists
    const existingAction = await getActionById(actionId)
    if (!existingAction) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      )
    }

    let updatedAction

    switch (status) {
      case 'approved':
        updatedAction = await approveAction(actionId)
        break

      case 'rejected':
        updatedAction = await rejectAction(actionId)
        break

      case 'pending':
        // Allow reverting to pending
        const db = getSupabase()
        const { data, error } = await db
          .from('cofounder_actions')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', actionId)
          .select()
          .single()

        if (error) throw error
        updatedAction = data
        break

      default:
        return NextResponse.json(
          { error: `Invalid status: ${status}` },
          { status: 400 }
        )
    }

    // Optionally update action details (e.g., edit suggested message)
    if (details && Object.keys(details).length > 0) {
      const db = getSupabase()
      const { data: currentAction } = await db
        .from('cofounder_actions')
        .select('details')
        .eq('id', actionId)
        .single()

      const mergedDetails = {
        ...currentAction?.details,
        ...details
      }

      const { data: updated, error } = await db
        .from('cofounder_actions')
        .update({
          details: mergedDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId)
        .select()
        .single()

      if (!error) {
        updatedAction = updated
      }
    }

    return NextResponse.json({
      message: `Action ${status}`,
      action: updatedAction
    })
  } catch (error) {
    console.error('Error updating action:', error)
    return NextResponse.json(
      { error: 'Failed to update action' },
      { status: 500 }
    )
  }
}

// DELETE /api/cofounder/actions - Delete action (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const actionId = searchParams.get('actionId')

    if (!actionId) {
      return NextResponse.json(
        { error: 'Missing actionId parameter' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    const { error } = await db
      .from('cofounder_actions')
      .delete()
      .eq('id', actionId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: 'Action deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting action:', error)
    return NextResponse.json(
      { error: 'Failed to delete action' },
      { status: 500 }
    )
  }
}
