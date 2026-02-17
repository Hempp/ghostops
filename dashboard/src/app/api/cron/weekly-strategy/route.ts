import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Initialize clients lazily at runtime
let anthropic: Anthropic | null = null
let supabase: SupabaseClient | null = null

function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropic
}

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

// Types for weekly strategy
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

interface WeeklyStrategyReport {
  businessId: string
  businessName: string
  businessType: string
  metrics: WeeklyMetrics
  goals: WeeklyGoals
  vsGoals: {
    leadsVsTarget: number
    revenueVsTarget: number
    conversionVsTarget: number
  }
  analysis: PerformanceAnalysis
  recommendations: StrategicRecommendation[]
  executiveSummary: string
  weeklyAgenda: string[]
  createdAt: string
}

// Verify cron request from Vercel
function verifyCronRequest(request: NextRequest): boolean {
  // Method 1: Check for Vercel cron signature header (set automatically by Vercel)
  const vercelCronSignature = request.headers.get('x-vercel-cron-signature')
  if (vercelCronSignature) {
    // Vercel sends this header for cron requests - presence indicates valid cron call
    return true
  }

  // Method 2: Check for CRON_SECRET in Authorization header (for manual/testing)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  // Method 3: Check for CRON_SECRET as query parameter (fallback)
  const url = new URL(request.url)
  const secretParam = url.searchParams.get('secret')
  if (cronSecret && secretParam === cronSecret) {
    return true
  }

  console.warn('CRON request verification failed: no valid signature or secret')
  return false
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('[CRON] Weekly strategy started at', new Date().toISOString())

  // Verify this is called by Vercel cron or authorized request
  if (!verifyCronRequest(request)) {
    console.error('[CRON] Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getSupabase()
    const ai = getAnthropic()
    const reportsGenerated: string[] = []

    // Get all active businesses
    const { data: businesses, error: bizError } = await db
      .from('businesses')
      .select('id, name, business_type, owner_phone, is_paused, features_enabled, settings')
      .eq('is_paused', false)

    if (bizError) {
      console.error('[CRON] Error fetching businesses:', bizError)
      throw bizError
    }

    if (!businesses || businesses.length === 0) {
      console.log('[CRON] No active businesses found')
      return NextResponse.json({
        success: true,
        message: 'No active businesses to process',
        duration: Date.now() - startTime
      })
    }

    console.log(`[CRON] Generating weekly strategy for ${businesses.length} businesses`)

    // Process each business
    for (const business of businesses) {
      try {
        const report = await generateWeeklyStrategy(
          db,
          ai,
          business.id,
          business.name || 'Your Business',
          business.business_type || 'general',
          business.settings
        )

        if (report) {
          // Store report in database
          await storeWeeklyReport(db, report)
          reportsGenerated.push(business.id)
        }
      } catch (bizError) {
        console.error(`[CRON] Error generating strategy for ${business.id}:`, bizError)
        // Continue processing other businesses
      }
    }

    const duration = Date.now() - startTime
    console.log(`[CRON] Weekly strategy completed in ${duration}ms`)
    console.log(`[CRON] Generated ${reportsGenerated.length} strategy reports`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        businessesProcessed: businesses.length,
        reportsGenerated: reportsGenerated.length,
        businessIds: reportsGenerated
      }
    })

  } catch (error) {
    console.error('[CRON] Weekly strategy failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

async function generateWeeklyStrategy(
  db: SupabaseClient,
  ai: Anthropic,
  businessId: string,
  businessName: string,
  businessType: string,
  settings: Record<string, unknown> | null
): Promise<WeeklyStrategyReport | null> {
  // Calculate week dates (last 7 days)
  const weekEnd = new Date()
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  // Fetch weekly stats
  const { data: statsData } = await db
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr)
    .order('date', { ascending: true })

  const stats = statsData || []

  // Aggregate weekly metrics
  const metrics: WeeklyMetrics = {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    totalLeads: stats.reduce((sum, s) => sum + (s.new_leads || 0), 0),
    totalMessages: stats.reduce((sum, s) => sum + (s.messages_sent || 0) + (s.messages_received || 0), 0),
    totalRevenue: stats.reduce((sum, s) => sum + (s.revenue_cents || 0), 0),
    invoicesSent: stats.reduce((sum, s) => sum + (s.invoices_sent || 0), 0),
    invoicesPaid: stats.reduce((sum, s) => sum + (s.invoices_paid || 0), 0),
    conversionRate: 0,
    avgResponseTime: null,
    missedCalls: stats.reduce((sum, s) => sum + (s.missed_calls || 0), 0),
    reviewsReceived: stats.reduce((sum, s) => sum + (s.reviews_received || 0), 0),
    postsPublished: stats.reduce((sum, s) => sum + (s.posts_published || 0), 0)
  }

  // Calculate conversion rate
  if (metrics.totalLeads > 0 && metrics.invoicesSent > 0) {
    metrics.conversionRate = (metrics.invoicesSent / metrics.totalLeads) * 100
  }

  // Fetch previous week for comparison
  const prevWeekEnd = new Date(weekStart.getTime() - 1)
  const prevWeekStart = new Date(prevWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
  const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0]
  const prevWeekEndStr = prevWeekEnd.toISOString().split('T')[0]

  const { data: prevStatsData } = await db
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .gte('date', prevWeekStartStr)
    .lte('date', prevWeekEndStr)

  const prevStats = prevStatsData || []
  const prevLeads = prevStats.reduce((sum, s) => sum + (s.new_leads || 0), 0)
  const prevRevenue = prevStats.reduce((sum, s) => sum + (s.revenue_cents || 0), 0)

  // Set goals based on previous performance or defaults
  const goals: WeeklyGoals = {
    leadsTarget: Math.max(prevLeads * 1.1, 10), // 10% growth or minimum 10
    revenueTarget: Math.max(prevRevenue * 1.1, 100000), // 10% growth or $1000
    conversionTarget: 25 // 25% conversion target
  }

  // Calculate vs goals
  const vsGoals = {
    leadsVsTarget: goals.leadsTarget > 0 ? ((metrics.totalLeads / goals.leadsTarget) * 100) - 100 : 0,
    revenueVsTarget: goals.revenueTarget > 0 ? ((metrics.totalRevenue / goals.revenueTarget) * 100) - 100 : 0,
    conversionVsTarget: metrics.conversionRate - goals.conversionTarget
  }

  // Generate AI analysis
  const { analysis, recommendations, executiveSummary, weeklyAgenda } = await generateAIStrategy(
    ai,
    businessName,
    businessType,
    metrics,
    goals,
    vsGoals,
    {
      prevLeads,
      prevRevenue,
      weekOverWeekLeadGrowth: prevLeads > 0 ? ((metrics.totalLeads - prevLeads) / prevLeads) * 100 : 0,
      weekOverWeekRevenueGrowth: prevRevenue > 0 ? ((metrics.totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
    }
  )

  return {
    businessId,
    businessName,
    businessType,
    metrics,
    goals,
    vsGoals,
    analysis,
    recommendations,
    executiveSummary,
    weeklyAgenda,
    createdAt: new Date().toISOString()
  }
}

async function generateAIStrategy(
  ai: Anthropic,
  businessName: string,
  businessType: string,
  metrics: WeeklyMetrics,
  goals: WeeklyGoals,
  vsGoals: { leadsVsTarget: number; revenueVsTarget: number; conversionVsTarget: number },
  comparison: { prevLeads: number; prevRevenue: number; weekOverWeekLeadGrowth: number; weekOverWeekRevenueGrowth: number }
): Promise<{
  analysis: PerformanceAnalysis
  recommendations: StrategicRecommendation[]
  executiveSummary: string
  weeklyAgenda: string[]
}> {
  const prompt = `You are a strategic business advisor preparing a weekly strategy report for "${businessName}" (${businessType} business).

LAST WEEK'S PERFORMANCE:
- Leads: ${metrics.totalLeads} (target: ${Math.round(goals.leadsTarget)}, ${vsGoals.leadsVsTarget > 0 ? '+' : ''}${vsGoals.leadsVsTarget.toFixed(1)}% vs target)
- Revenue: $${(metrics.totalRevenue / 100).toFixed(2)} (target: $${(goals.revenueTarget / 100).toFixed(2)}, ${vsGoals.revenueVsTarget > 0 ? '+' : ''}${vsGoals.revenueVsTarget.toFixed(1)}% vs target)
- Conversion Rate: ${metrics.conversionRate.toFixed(1)}% (target: ${goals.conversionTarget}%)
- Invoices: ${metrics.invoicesSent} sent, ${metrics.invoicesPaid} paid
- Messages: ${metrics.totalMessages} total
- Missed Calls: ${metrics.missedCalls}
- Reviews: ${metrics.reviewsReceived}
- Social Posts: ${metrics.postsPublished}

WEEK-OVER-WEEK COMPARISON:
- Lead Growth: ${comparison.weekOverWeekLeadGrowth > 0 ? '+' : ''}${comparison.weekOverWeekLeadGrowth.toFixed(1)}%
- Revenue Growth: ${comparison.weekOverWeekRevenueGrowth > 0 ? '+' : ''}${comparison.weekOverWeekRevenueGrowth.toFixed(1)}%

Provide a comprehensive strategic analysis. Be specific, actionable, and data-driven.

Format your response as JSON:
{
  "executiveSummary": "2-3 sentence summary of the week and outlook",
  "analysis": {
    "whatWorked": ["Specific thing 1", "Specific thing 2", "Specific thing 3"],
    "whatDidntWork": ["Issue 1", "Issue 2"],
    "keyInsights": ["Insight 1", "Insight 2", "Insight 3"]
  },
  "recommendations": [
    {
      "category": "revenue|leads|operations|marketing|customer_success",
      "priority": "high|medium|low",
      "title": "Short action title",
      "description": "Detailed explanation",
      "expectedImpact": "Expected outcome"
    }
  ],
  "weeklyAgenda": ["Monday priority", "Tuesday priority", "Wednesday priority", "Thursday priority", "Friday priority"]
}

Provide 3-5 strategic recommendations prioritized by impact.`

  try {
    const response = await ai.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON')
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      executiveSummary: string
      analysis: PerformanceAnalysis
      recommendations: StrategicRecommendation[]
      weeklyAgenda: string[]
    }

    return {
      executiveSummary: parsed.executiveSummary || 'Unable to generate summary.',
      analysis: parsed.analysis || {
        whatWorked: ['Data collection in progress'],
        whatDidntWork: ['Insufficient data for analysis'],
        keyInsights: ['Continue tracking metrics for better insights']
      },
      recommendations: parsed.recommendations || [{
        category: 'operations',
        priority: 'high',
        title: 'Establish baseline metrics',
        description: 'Continue tracking all business metrics to enable better strategic analysis.',
        expectedImpact: 'Improved decision-making capability'
      }],
      weeklyAgenda: parsed.weeklyAgenda || [
        'Review last week\'s metrics',
        'Follow up on outstanding invoices',
        'Engage new leads',
        'Plan marketing activities',
        'Review and prepare for next week'
      ]
    }
  } catch (error) {
    console.error('[CRON] Error generating AI strategy:', error)
    // Return fallback strategy
    const hitLeadTarget = vsGoals.leadsVsTarget >= 0
    const hitRevenueTarget = vsGoals.revenueVsTarget >= 0

    return {
      executiveSummary: `This week ${businessName} generated ${metrics.totalLeads} leads and $${(metrics.totalRevenue / 100).toFixed(0)} in revenue. ${hitLeadTarget && hitRevenueTarget ? 'Goals were met.' : 'Some targets require attention.'}`,
      analysis: {
        whatWorked: hitLeadTarget ? ['Lead generation met targets'] : ['Consistent tracking'],
        whatDidntWork: !hitRevenueTarget ? ['Revenue below target'] : ['Areas to monitor'],
        keyInsights: ['Focus on conversion optimization', 'Maintain consistent follow-up']
      },
      recommendations: [
        {
          category: 'leads',
          priority: 'high',
          title: hitLeadTarget ? 'Scale lead sources' : 'Boost lead generation',
          description: hitLeadTarget ? 'Double down on working channels' : 'Review and optimize lead sources',
          expectedImpact: '10-20% lead increase'
        },
        {
          category: 'revenue',
          priority: 'high',
          title: 'Improve invoice follow-up',
          description: 'Implement systematic follow-up for outstanding invoices',
          expectedImpact: 'Faster cash collection'
        }
      ],
      weeklyAgenda: [
        'Monday: Review metrics and set weekly priorities',
        'Tuesday: Follow up on hot leads',
        'Wednesday: Chase outstanding invoices',
        'Thursday: Marketing and outreach',
        'Friday: Week review and next week planning'
      ]
    }
  }
}

async function storeWeeklyReport(db: SupabaseClient, report: WeeklyStrategyReport): Promise<void> {
  const { error } = await db
    .from('weekly_strategy_reports')
    .upsert({
      business_id: report.businessId,
      week_start: report.metrics.weekStart,
      week_end: report.metrics.weekEnd,
      metrics: report.metrics,
      goals: report.goals,
      vs_goals: report.vsGoals,
      analysis: report.analysis,
      recommendations: report.recommendations,
      executive_summary: report.executiveSummary,
      weekly_agenda: report.weeklyAgenda,
      created_at: report.createdAt
    }, {
      onConflict: 'business_id,week_start'
    })

  if (error) {
    // If table doesn't exist, log but don't fail
    if (error.code === '42P01') {
      console.warn('[CRON] weekly_strategy_reports table does not exist - attempting alternate storage')

      // Try storing in a more generic table if available
      const { error: altError } = await db
        .from('notifications')
        .insert({
          business_id: report.businessId,
          type: 'weekly_strategy',
          title: `Weekly Strategy Report - Week of ${report.metrics.weekStart}`,
          content: report.executiveSummary,
          metadata: {
            metrics: report.metrics,
            goals: report.goals,
            vsGoals: report.vsGoals,
            analysis: report.analysis,
            recommendations: report.recommendations,
            weeklyAgenda: report.weeklyAgenda
          },
          created_at: report.createdAt
        })

      if (altError && altError.code !== '42P01') {
        console.error('[CRON] Error storing report in alternate table:', altError)
      }
      return
    }

    console.error('[CRON] Error storing weekly report:', error)
    throw error
  }

  console.log(`[CRON] Stored weekly strategy for ${report.businessId} - Week of ${report.metrics.weekStart}`)
}

// Ensure this route is not cached
export const dynamic = 'force-dynamic'
export const revalidate = 0
