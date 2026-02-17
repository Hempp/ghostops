import { NextRequest, NextResponse } from 'next/server'
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

// Types matching the cron job output
interface WeeklyMetrics {
  weekStart: string
  weekEnd: string
  totalLeads: number
  totalMessages: number
  totalRevenue: number
  invoicesSent: number
  invoicesPaid: number
  conversionRate: number
  avgResponseTime: number | null
  missedCalls: number
  reviewsReceived: number
  postsPublished: number
}

interface WeeklyGoals {
  leadsTarget: number
  revenueTarget: number
  conversionTarget: number
}

interface PerformanceAnalysis {
  whatWorked: string[]
  whatDidntWork: string[]
  keyInsights: string[]
}

interface StrategicRecommendation {
  category: 'revenue' | 'leads' | 'operations' | 'marketing' | 'customer_success'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  expectedImpact: string
}

interface WeeklyStrategyReportRow {
  id: string
  business_id: string
  week_start: string
  week_end: string
  metrics: WeeklyMetrics
  goals: WeeklyGoals
  vs_goals: {
    leadsVsTarget: number
    revenueVsTarget: number
    conversionVsTarget: number
  }
  analysis: PerformanceAnalysis
  recommendations: StrategicRecommendation[]
  executive_summary: string
  weekly_agenda: string[]
  created_at: string
}

// Also check notifications table fallback format
interface NotificationRow {
  id: string
  business_id: string
  type: string
  title: string
  content: string
  metadata: {
    metrics: WeeklyMetrics
    goals: WeeklyGoals
    vsGoals: {
      leadsVsTarget: number
      revenueVsTarget: number
      conversionVsTarget: number
    }
    analysis: PerformanceAnalysis
    recommendations: StrategicRecommendation[]
    weeklyAgenda: string[]
  }
  created_at: string
}

/**
 * GET /api/cofounder/weekly-strategy
 * Fetch the latest weekly strategy report for a business
 * Query params:
 *   - businessId: required
 *   - weekStart: optional, specific week to fetch (YYYY-MM-DD format)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const weekStart = searchParams.get('weekStart')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const db = getSupabase()

    // Try to fetch from weekly_strategy_reports table first
    let report = await fetchFromReportsTable(db, businessId, weekStart)

    // If not found in reports table, try notifications fallback
    if (!report) {
      report = await fetchFromNotificationsTable(db, businessId, weekStart)
    }

    if (!report) {
      return NextResponse.json({
        report: null,
        message: 'No weekly strategy report found. Reports are generated weekly by the system.'
      })
    }

    return NextResponse.json({
      report,
      source: report._source
    })
  } catch (error) {
    console.error('Error fetching weekly strategy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly strategy' },
      { status: 500 }
    )
  }
}

async function fetchFromReportsTable(
  db: SupabaseClient,
  businessId: string,
  weekStart?: string | null
): Promise<WeeklyStrategyReport | null> {
  try {
    let query = db
      .from('weekly_strategy_reports')
      .select('*')
      .eq('business_id', businessId)

    if (weekStart) {
      query = query.eq('week_start', weekStart)
    } else {
      query = query.order('week_start', { ascending: false }).limit(1)
    }

    const { data, error } = await query.single()

    if (error) {
      // Table doesn't exist or no data
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching from weekly_strategy_reports:', error)
      return null
    }

    if (!data) return null

    const row = data as WeeklyStrategyReportRow

    // Transform to frontend format
    return transformReportRow(row)
  } catch {
    return null
  }
}

async function fetchFromNotificationsTable(
  db: SupabaseClient,
  businessId: string,
  weekStart?: string | null
): Promise<WeeklyStrategyReport | null> {
  try {
    let query = db
      .from('notifications')
      .select('*')
      .eq('business_id', businessId)
      .eq('type', 'weekly_strategy')

    if (weekStart) {
      // Filter by week start date in the title/metadata
      query = query.ilike('title', `%${weekStart}%`)
    }

    query = query.order('created_at', { ascending: false }).limit(1)

    const { data, error } = await query.single()

    if (error) {
      // Table doesn't exist or no data
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching from notifications:', error)
      return null
    }

    if (!data || !data.metadata) return null

    const row = data as NotificationRow

    // Transform notification format to report format
    return transformNotificationRow(row)
  } catch {
    return null
  }
}

// Shared types for the transformed report
export interface WeeklyStrategyReport {
  id: string
  businessId: string
  weekStart: string
  weekEnd: string
  executiveSummary: string
  overallScore: number
  metrics: {
    totalLeads: number
    totalLeadsLastWeek: number
    totalRevenue: number
    totalRevenueLastWeek: number
    conversionRate: number
    conversionRateLastWeek: number
    totalMessages: number
    totalMessagesLastWeek: number
    invoicesSent: number
    invoicesPaid: number
    missedCalls: number
    reviewsReceived: number
    postsPublished: number
  }
  goals: WeeklyGoals
  vsGoals: {
    leadsVsTarget: number
    revenueVsTarget: number
    conversionVsTarget: number
  }
  analysis: PerformanceAnalysis
  recommendations: StrategicRecommendation[]
  weeklyAgenda: string[]
  createdAt: string
  _source: 'reports' | 'notifications'
}

function transformReportRow(row: WeeklyStrategyReportRow): WeeklyStrategyReport {
  // Calculate an overall score based on goal performance
  const vsGoals = row.vs_goals
  const avgGoalPerformance = (
    Math.min(vsGoals.leadsVsTarget + 100, 150) +
    Math.min(vsGoals.revenueVsTarget + 100, 150) +
    Math.min(vsGoals.conversionVsTarget + 100, 150)
  ) / 3
  const overallScore = Math.min(Math.max(Math.round(avgGoalPerformance * 0.66), 0), 100)

  return {
    id: row.id,
    businessId: row.business_id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    executiveSummary: row.executive_summary,
    overallScore,
    metrics: {
      totalLeads: row.metrics.totalLeads,
      totalLeadsLastWeek: Math.round(row.metrics.totalLeads / (1 + vsGoals.leadsVsTarget / 100)),
      totalRevenue: row.metrics.totalRevenue,
      totalRevenueLastWeek: Math.round(row.metrics.totalRevenue / (1 + vsGoals.revenueVsTarget / 100)),
      conversionRate: row.metrics.conversionRate,
      conversionRateLastWeek: row.metrics.conversionRate - vsGoals.conversionVsTarget,
      totalMessages: row.metrics.totalMessages,
      totalMessagesLastWeek: row.metrics.totalMessages, // No previous data available
      invoicesSent: row.metrics.invoicesSent,
      invoicesPaid: row.metrics.invoicesPaid,
      missedCalls: row.metrics.missedCalls,
      reviewsReceived: row.metrics.reviewsReceived,
      postsPublished: row.metrics.postsPublished
    },
    goals: row.goals,
    vsGoals: row.vs_goals,
    analysis: row.analysis,
    recommendations: row.recommendations,
    weeklyAgenda: row.weekly_agenda,
    createdAt: row.created_at,
    _source: 'reports'
  }
}

function transformNotificationRow(row: NotificationRow): WeeklyStrategyReport {
  const meta = row.metadata
  const vsGoals = meta.vsGoals

  // Calculate overall score
  const avgGoalPerformance = (
    Math.min(vsGoals.leadsVsTarget + 100, 150) +
    Math.min(vsGoals.revenueVsTarget + 100, 150) +
    Math.min(vsGoals.conversionVsTarget + 100, 150)
  ) / 3
  const overallScore = Math.min(Math.max(Math.round(avgGoalPerformance * 0.66), 0), 100)

  // Extract week dates from metrics
  const weekStart = meta.metrics.weekStart
  const weekEnd = meta.metrics.weekEnd

  return {
    id: row.id,
    businessId: row.business_id,
    weekStart,
    weekEnd,
    executiveSummary: row.content,
    overallScore,
    metrics: {
      totalLeads: meta.metrics.totalLeads,
      totalLeadsLastWeek: Math.round(meta.metrics.totalLeads / (1 + vsGoals.leadsVsTarget / 100)) || 0,
      totalRevenue: meta.metrics.totalRevenue,
      totalRevenueLastWeek: Math.round(meta.metrics.totalRevenue / (1 + vsGoals.revenueVsTarget / 100)) || 0,
      conversionRate: meta.metrics.conversionRate,
      conversionRateLastWeek: meta.metrics.conversionRate - vsGoals.conversionVsTarget,
      totalMessages: meta.metrics.totalMessages,
      totalMessagesLastWeek: meta.metrics.totalMessages,
      invoicesSent: meta.metrics.invoicesSent,
      invoicesPaid: meta.metrics.invoicesPaid,
      missedCalls: meta.metrics.missedCalls,
      reviewsReceived: meta.metrics.reviewsReceived,
      postsPublished: meta.metrics.postsPublished
    },
    goals: meta.goals,
    vsGoals: meta.vsGoals,
    analysis: meta.analysis,
    recommendations: meta.recommendations,
    weeklyAgenda: meta.weeklyAgenda,
    createdAt: row.created_at,
    _source: 'notifications'
  }
}

// Ensure this route is not cached
export const dynamic = 'force-dynamic'
export const revalidate = 0
