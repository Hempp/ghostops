import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization
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

export interface Notification {
  id: string
  business_id: string
  type: string
  title: string
  message: string
  channel: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'sent' | 'failed' | 'read'
  metadata: Record<string, unknown>
  scheduled_for: string | null
  sent_at: string | null
  read_at: string | null
  error: string | null
  created_at: string
}

// GET /api/notifications - Fetch notifications for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const type = searchParams.get('type')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing required parameter: businessId' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    // Build query
    let query = db
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .in('status', unreadOnly ? ['sent', 'pending'] : ['pending', 'sent', 'failed', 'read'])
      .order('created_at', { ascending: false })

    // Filter by type if specified
    if (type) {
      query = query.eq('type', type)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Failed to fetch notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Get unread count separately for badge
    const { count: unreadCount } = await db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .in('status', ['sent', 'pending'])

    return NextResponse.json({
      notifications: data as Notification[],
      total: count || 0,
      unreadCount: unreadCount || 0,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - Update notification(s)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId, notificationIds, businessId, action } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing required field: businessId' },
        { status: 400 }
      )
    }

    if (!action || !['mark_read', 'mark_all_read', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: mark_read, mark_all_read, or dismiss' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    // Handle different actions
    switch (action) {
      case 'mark_read': {
        // Mark specific notification(s) as read
        const ids = notificationIds || (notificationId ? [notificationId] : [])
        if (ids.length === 0) {
          return NextResponse.json(
            { error: 'Must provide notificationId or notificationIds' },
            { status: 400 }
          )
        }

        const { error } = await db
          .from('notifications')
          .update({
            status: 'read',
            read_at: new Date().toISOString()
          })
          .eq('business_id', businessId)
          .in('id', ids)

        if (error) {
          console.error('Failed to mark notifications as read:', error)
          return NextResponse.json(
            { error: 'Failed to update notifications' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `Marked ${ids.length} notification(s) as read`
        })
      }

      case 'mark_all_read': {
        // Mark all unread notifications as read
        const { error, count } = await db
          .from('notifications')
          .update({
            status: 'read',
            read_at: new Date().toISOString()
          })
          .eq('business_id', businessId)
          .in('status', ['sent', 'pending'])

        if (error) {
          console.error('Failed to mark all notifications as read:', error)
          return NextResponse.json(
            { error: 'Failed to update notifications' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `Marked all notifications as read`,
          count
        })
      }

      case 'dismiss': {
        // Soft delete by marking as read (or could implement actual delete)
        const ids = notificationIds || (notificationId ? [notificationId] : [])
        if (ids.length === 0) {
          return NextResponse.json(
            { error: 'Must provide notificationId or notificationIds' },
            { status: 400 }
          )
        }

        const { error } = await db
          .from('notifications')
          .update({
            status: 'read',
            read_at: new Date().toISOString(),
            metadata: { dismissed: true }
          })
          .eq('business_id', businessId)
          .in('id', ids)

        if (error) {
          console.error('Failed to dismiss notifications:', error)
          return NextResponse.json(
            { error: 'Failed to dismiss notifications' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `Dismissed ${ids.length} notification(s)`
        })
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications - Delete old notifications (cleanup)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30', 10)

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing required parameter: businessId' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const { error, count } = await db
      .from('notifications')
      .delete()
      .eq('business_id', businessId)
      .eq('status', 'read')
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      console.error('Failed to delete old notifications:', error)
      return NextResponse.json(
        { error: 'Failed to delete notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${count || 0} old notifications`,
      count
    })

  } catch (error) {
    console.error('Notifications DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    )
  }
}
