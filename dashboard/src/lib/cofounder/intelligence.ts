import Anthropic from '@anthropic-ai/sdk'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Types for intelligence functions
export interface CustomerHealthResult {
  score: number // 0-100
  factors: { name: string; impact: number; detail: string }[]
  risk: 'low' | 'medium' | 'high'
  recommendation: string
}

export interface OpportunityResult {
  type: 'upsell' | 'referral' | 'retention' | 'growth'
  description: string
  potentialValue: number
  suggestedAction: string
  priority: 'low' | 'medium' | 'high'
  contactId?: string
  contactName?: string
}

export interface SeasonalInsightResult {
  upcomingEvents: { name: string; date: string; prepActions: string[] }[]
  historicalPatterns: { period: string; insight: string }[]
  recommendations: string[]
}

export interface GoalProgressResult {
  goals: {
    id: string
    name: string
    target: number
    current: number
    unit: string
    trend: 'up' | 'down' | 'stable'
    percentComplete: number
  }[]
  overallHealth: number
  recommendations: string[]
}

// Initialize clients lazily at runtime
let anthropic: Anthropic | null = null
let supabase: SupabaseClient | null = null

function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropic
}

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

/**
 * Calculate Customer Health Score
 * Analyzes engagement, payment history, communication patterns to score customer health
 */
export async function calculateCustomerHealth(
  contactId: string,
  businessId: string
): Promise<CustomerHealthResult> {
  const db = getSupabase()

  // Fetch contact data
  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  if (contactError || !contact) {
    throw new Error('Contact not found')
  }

  // Fetch related data in parallel
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [messagesRes, invoicesRes, conversationsRes] = await Promise.all([
    // Recent messages
    db.from('messages')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false }),
    // All invoices for this contact
    db.from('invoices')
      .select('*')
      .eq('business_id', businessId)
      .eq('contact_phone', contact.phone),
    // Conversations
    db.from('conversations')
      .select('*')
      .eq('business_id', businessId)
      .eq('contact_id', contactId)
  ])

  const messages = messagesRes.data || []
  const invoices = invoicesRes.data || []
  const conversations = conversationsRes.data || []

  // Calculate factors
  const factors: { name: string; impact: number; detail: string }[] = []
  let totalScore = 100

  // 1. Engagement Score (based on recent communication)
  const recentConversations = conversations.filter(
    c => new Date(c.last_message_at) > new Date(thirtyDaysAgo)
  )
  if (recentConversations.length === 0) {
    const impact = -20
    totalScore += impact
    factors.push({
      name: 'Engagement',
      impact,
      detail: 'No communication in the last 30 days'
    })
  } else {
    factors.push({
      name: 'Engagement',
      impact: 10,
      detail: `${recentConversations.length} active conversations recently`
    })
    totalScore += 10
  }

  // 2. Payment History
  const paidInvoices = invoices.filter(i => i.status === 'paid')
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')
  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'pending')

  if (overdueInvoices.length > 0) {
    const impact = -15 * overdueInvoices.length
    totalScore += impact
    factors.push({
      name: 'Payment History',
      impact,
      detail: `${overdueInvoices.length} overdue invoice(s)`
    })
  } else if (paidInvoices.length > 0) {
    const impact = 10
    totalScore += impact
    factors.push({
      name: 'Payment History',
      impact,
      detail: `${paidInvoices.length} paid invoice(s), good payment history`
    })
  } else if (pendingInvoices.length > 0) {
    factors.push({
      name: 'Payment History',
      impact: 0,
      detail: `${pendingInvoices.length} pending invoice(s)`
    })
  }

  // 3. Response Rate
  const inboundMessages = messages.filter(m => m.direction === 'inbound')
  const outboundMessages = messages.filter(m => m.direction === 'outbound')

  if (outboundMessages.length > inboundMessages.length * 3) {
    const impact = -10
    totalScore += impact
    factors.push({
      name: 'Response Rate',
      impact,
      detail: 'Low response rate to messages'
    })
  }

  // 4. Customer Lifetime
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(contact.created_at).getTime()) / (24 * 60 * 60 * 1000)
  )
  if (daysSinceCreation > 365) {
    const impact = 15
    totalScore += impact
    factors.push({
      name: 'Customer Lifetime',
      impact,
      detail: 'Long-term customer (1+ year)'
    })
  } else if (daysSinceCreation > 90) {
    const impact = 5
    totalScore += impact
    factors.push({
      name: 'Customer Lifetime',
      impact,
      detail: 'Established customer (3+ months)'
    })
  }

  // 5. Revenue Contribution
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount_cents || 0), 0)
  if (totalRevenue > 500000) { // $5000+
    const impact = 15
    totalScore += impact
    factors.push({
      name: 'Revenue Contribution',
      impact,
      detail: `High value customer ($${(totalRevenue / 100).toLocaleString()} total)`
    })
  } else if (totalRevenue > 100000) { // $1000+
    const impact = 5
    totalScore += impact
    factors.push({
      name: 'Revenue Contribution',
      impact,
      detail: `Moderate value customer ($${(totalRevenue / 100).toLocaleString()} total)`
    })
  }

  // Normalize score to 0-100
  const normalizedScore = Math.max(0, Math.min(100, totalScore))

  // Determine risk level
  let risk: 'low' | 'medium' | 'high'
  if (normalizedScore >= 70) {
    risk = 'low'
  } else if (normalizedScore >= 40) {
    risk = 'medium'
  } else {
    risk = 'high'
  }

  // Generate AI recommendation
  const recommendation = await generateHealthRecommendation(
    contact,
    factors,
    normalizedScore,
    risk
  )

  return {
    score: normalizedScore,
    factors,
    risk,
    recommendation
  }
}

async function generateHealthRecommendation(
  contact: any,
  factors: { name: string; impact: number; detail: string }[],
  score: number,
  risk: 'low' | 'medium' | 'high'
): Promise<string> {
  const client = getAnthropic()

  const negativefactors = factors.filter(f => f.impact < 0)
  const factorsSummary = factors.map(f => `${f.name}: ${f.detail} (${f.impact >= 0 ? '+' : ''}${f.impact})`).join('\n')

  const prompt = `You are a business strategist. A customer named "${contact.name || 'Unknown'}" has a health score of ${score}/100 (${risk} risk).

Factors affecting their score:
${factorsSummary}

Provide a single, specific, actionable recommendation (1-2 sentences) to improve this customer relationship. Focus on the most impactful action.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    })

    const textContent = response.content.find(c => c.type === 'text')
    return textContent && textContent.type === 'text'
      ? textContent.text
      : 'Maintain regular communication and monitor engagement.'
  } catch (error) {
    console.error('Error generating recommendation:', error)
    // Fallback recommendation based on risk
    if (risk === 'high') {
      return 'Reach out immediately to re-engage this at-risk customer.'
    } else if (risk === 'medium') {
      return 'Schedule a check-in to strengthen this customer relationship.'
    }
    return 'Continue current engagement strategy.'
  }
}

/**
 * Detect Opportunities
 * Analyzes business data to identify upsell, referral, retention, and growth opportunities
 */
export async function detectOpportunities(
  businessId: string
): Promise<OpportunityResult[]> {
  const db = getSupabase()
  const client = getAnthropic()

  // Fetch business data
  const [businessRes, contactsRes, invoicesRes, statsRes, conversationsRes] = await Promise.all([
    db.from('businesses').select('*').eq('id', businessId).single(),
    db.from('contacts').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(50),
    db.from('invoices').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(100),
    db.from('daily_stats').select('*').eq('business_id', businessId).order('date', { ascending: false }).limit(30),
    db.from('conversations').select('*').eq('business_id', businessId).order('last_message_at', { ascending: false }).limit(50)
  ])

  const business = businessRes.data
  const contacts = contactsRes.data || []
  const invoices = invoicesRes.data || []
  const stats = statsRes.data || []
  const conversations = conversationsRes.data || []

  const opportunities: OpportunityResult[] = []

  // 1. RETENTION: Find at-risk customers (no recent activity but past revenue)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const activeContactIds = new Set(
    conversations
      .filter(c => new Date(c.last_message_at) > thirtyDaysAgo)
      .map(c => c.contact_id)
  )

  const paidCustomers = new Map<string, { total: number; phone: string; name: string }>()
  invoices
    .filter(i => i.status === 'paid')
    .forEach(i => {
      const existing = paidCustomers.get(i.contact_phone) || { total: 0, phone: i.contact_phone, name: i.contact_name }
      existing.total += i.amount_cents || 0
      paidCustomers.set(i.contact_phone, existing)
    })

  // Find inactive high-value customers
  Array.from(paidCustomers.entries()).forEach(([phone, customer]) => {
    const contact = contacts.find(c => c.phone === phone)
    if (contact && !activeContactIds.has(contact.id) && customer.total > 50000) { // $500+
      opportunities.push({
        type: 'retention',
        description: `${customer.name || 'Customer'} hasn't been active in 30+ days but has spent $${(customer.total / 100).toLocaleString()}`,
        potentialValue: customer.total / 100 * 0.5, // Estimate 50% retention value
        suggestedAction: 'Send a personalized check-in message or exclusive offer',
        priority: customer.total > 200000 ? 'high' : 'medium',
        contactId: contact.id,
        contactName: customer.name || contact.name
      })
    }
  })

  // 2. UPSELL: Find customers with consistent payment history
  const frequentCustomers = new Map<string, { count: number; total: number; name: string }>()
  invoices
    .filter(i => i.status === 'paid')
    .forEach(i => {
      const existing = frequentCustomers.get(i.contact_phone) || { count: 0, total: 0, name: i.contact_name }
      existing.count++
      existing.total += i.amount_cents || 0
      frequentCustomers.set(i.contact_phone, existing)
    })

  Array.from(frequentCustomers.entries()).forEach(([phone, customer]) => {
    if (customer.count >= 3) {
      const contact = contacts.find(c => c.phone === phone)
      const avgTicket = customer.total / customer.count
      opportunities.push({
        type: 'upsell',
        description: `${customer.name || 'Customer'} has ${customer.count} purchases with avg ticket $${(avgTicket / 100).toFixed(0)}`,
        potentialValue: avgTicket / 100 * 0.3, // Estimate 30% upsell opportunity
        suggestedAction: 'Offer premium service tier or complementary add-ons',
        priority: customer.count >= 5 ? 'high' : 'medium',
        contactId: contact?.id,
        contactName: customer.name || contact?.name
      })
    }
  })

  // 3. REFERRAL: Find highly engaged satisfied customers
  const recentPayers = invoices
    .filter(i => i.status === 'paid' && new Date(i.paid_at) > thirtyDaysAgo)
    .slice(0, 5)

  for (const invoice of recentPayers) {
    const contact = contacts.find(c => c.phone === invoice.contact_phone)
    if (contact && invoice.amount_cents > 20000) { // $200+ recent purchase
      opportunities.push({
        type: 'referral',
        description: `${invoice.contact_name || 'Customer'} recently paid $${(invoice.amount_cents / 100).toFixed(0)} - good referral candidate`,
        potentialValue: invoice.amount_cents / 100 * 2, // Referral could bring similar value
        suggestedAction: 'Request a review or offer referral incentive',
        priority: 'medium',
        contactId: contact.id,
        contactName: invoice.contact_name || contact.name
      })
    }
  }

  // 4. GROWTH: Analyze trends for growth opportunities
  if (stats.length >= 7) {
    const recentLeads = stats.slice(0, 7).reduce((sum, s) => sum + (s.new_leads || 0), 0)
    const previousLeads = stats.slice(7, 14).reduce((sum, s) => sum + (s.new_leads || 0), 0)

    if (recentLeads > previousLeads * 1.2) {
      opportunities.push({
        type: 'growth',
        description: `Lead volume up ${Math.round((recentLeads - previousLeads) / (previousLeads || 1) * 100)}% - momentum building`,
        potentialValue: recentLeads * 200, // Estimate $200 avg lead value
        suggestedAction: 'Double down on current marketing channels while momentum is hot',
        priority: 'high'
      })
    }

    const avgDailyRevenue = stats.reduce((sum, s) => sum + (s.revenue_cents || 0), 0) / stats.length
    if (avgDailyRevenue < 10000) { // Less than $100/day
      opportunities.push({
        type: 'growth',
        description: 'Revenue below industry average - room for optimization',
        potentialValue: 5000,
        suggestedAction: 'Review pricing strategy and explore new revenue streams',
        priority: 'high'
      })
    }
  }

  // Sort by potential value
  opportunities.sort((a, b) => b.potentialValue - a.potentialValue)

  return opportunities.slice(0, 10) // Return top 10 opportunities
}

/**
 * Get Seasonal Insights
 * Analyzes historical patterns and upcoming seasonal events relevant to the business
 */
export async function getSeasonalInsights(
  businessId: string
): Promise<SeasonalInsightResult> {
  const db = getSupabase()
  const client = getAnthropic()

  // Fetch business data
  const [businessRes, statsRes] = await Promise.all([
    db.from('businesses').select('*').eq('id', businessId).single(),
    db.from('daily_stats').select('*').eq('business_id', businessId).order('date', { ascending: false }).limit(365)
  ])

  const business = businessRes.data
  const stats = statsRes.data || []

  const businessType = business?.business_type || 'general business'
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  // Generate seasonal insights using Claude
  const prompt = `You are a business strategist specializing in ${businessType}.

Current date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Based on your industry expertise, provide:

1. TOP 3 UPCOMING EVENTS/SEASONS (next 90 days) relevant to a ${businessType}
   For each event, provide:
   - Event name
   - Date (use format YYYY-MM-DD)
   - 2-3 specific preparation actions

2. TOP 3 HISTORICAL PATTERNS that typically affect ${businessType} businesses at this time of year
   For each pattern:
   - Time period description
   - Business insight

Respond in JSON format only:
{
  "upcomingEvents": [
    {"name": "Event Name", "date": "YYYY-MM-DD", "prepActions": ["action1", "action2"]}
  ],
  "historicalPatterns": [
    {"period": "Time period", "insight": "Business insight"}
  ],
  "recommendations": ["Top recommendation 1", "Top recommendation 2"]
}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (textContent && textContent.type === 'text') {
      // Extract JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          upcomingEvents: parsed.upcomingEvents || [],
          historicalPatterns: parsed.historicalPatterns || [],
          recommendations: parsed.recommendations || []
        }
      }
    }
  } catch (error) {
    console.error('Error generating seasonal insights:', error)
  }

  // Fallback response
  return {
    upcomingEvents: [
      {
        name: 'End of Month',
        date: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0],
        prepActions: ['Review monthly goals', 'Send payment reminders', 'Plan next month']
      }
    ],
    historicalPatterns: [
      {
        period: 'End of quarter',
        insight: 'Customer activity typically increases as businesses finalize projects'
      }
    ],
    recommendations: [
      'Review and follow up on outstanding invoices',
      'Plan content and promotions for the upcoming month'
    ]
  }
}

/**
 * Track Goal Progress
 * Monitors business goals and provides progress updates with recommendations
 */
export async function trackGoalProgress(
  businessId: string
): Promise<GoalProgressResult> {
  const db = getSupabase()
  const client = getAnthropic()

  // Fetch goals and current metrics
  const [goalsRes, statsRes, invoicesRes] = await Promise.all([
    db.from('business_goals')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    db.from('daily_stats')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: false })
      .limit(60),
    db.from('invoices')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'paid')
      .gte('paid_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  ])

  const dbGoals = goalsRes.data || []
  const stats = statsRes.data || []
  const recentInvoices = invoicesRes.data || []

  // Calculate current metrics
  const monthlyStats = stats.slice(0, 30)
  const previousMonthStats = stats.slice(30, 60)

  const currentMetrics = {
    revenue: recentInvoices.reduce((sum, i) => sum + (i.amount_cents || 0), 0) / 100,
    leads: monthlyStats.reduce((sum, s) => sum + (s.new_leads || 0), 0),
    messages: monthlyStats.reduce((sum, s) => sum + (s.messages_sent || 0) + (s.messages_received || 0), 0),
    missedCalls: monthlyStats.reduce((sum, s) => sum + (s.missed_calls || 0), 0)
  }

  const previousMetrics = {
    revenue: previousMonthStats.reduce((sum, s) => sum + (s.revenue_cents || 0), 0) / 100,
    leads: previousMonthStats.reduce((sum, s) => sum + (s.new_leads || 0), 0),
    messages: previousMonthStats.reduce((sum, s) => sum + (s.messages_sent || 0) + (s.messages_received || 0), 0)
  }

  // Map database goals to progress format
  const goals = dbGoals.map(goal => {
    let current = 0
    let trend: 'up' | 'down' | 'stable' = 'stable'

    // Determine current value based on goal type
    switch (goal.metric_type) {
      case 'revenue':
        current = currentMetrics.revenue
        trend = currentMetrics.revenue > previousMetrics.revenue ? 'up' :
                currentMetrics.revenue < previousMetrics.revenue ? 'down' : 'stable'
        break
      case 'leads':
        current = currentMetrics.leads
        trend = currentMetrics.leads > previousMetrics.leads ? 'up' :
                currentMetrics.leads < previousMetrics.leads ? 'down' : 'stable'
        break
      case 'messages':
        current = currentMetrics.messages
        trend = currentMetrics.messages > previousMetrics.messages ? 'up' :
                currentMetrics.messages < previousMetrics.messages ? 'down' : 'stable'
        break
      case 'custom':
        current = goal.current_value || 0
        break
      default:
        current = goal.current_value || 0
    }

    const percentComplete = goal.target_value > 0
      ? Math.round((current / goal.target_value) * 100)
      : 0

    return {
      id: goal.id,
      name: goal.name,
      target: goal.target_value,
      current,
      unit: goal.unit || '',
      trend,
      percentComplete: Math.min(100, percentComplete)
    }
  })

  // If no goals exist, create suggested default goals
  if (goals.length === 0) {
    goals.push(
      {
        id: 'suggested-revenue',
        name: 'Monthly Revenue',
        target: Math.round((currentMetrics.revenue || 1000) * 1.2),
        current: currentMetrics.revenue,
        unit: '$',
        trend: 'stable' as const,
        percentComplete: 0
      },
      {
        id: 'suggested-leads',
        name: 'New Leads',
        target: Math.round((currentMetrics.leads || 10) * 1.2),
        current: currentMetrics.leads,
        unit: 'leads',
        trend: 'stable' as const,
        percentComplete: 0
      }
    )
  }

  // Calculate overall health based on goal progress
  const avgProgress = goals.reduce((sum, g) => sum + g.percentComplete, 0) / goals.length
  const goalsOnTrack = goals.filter(g => g.percentComplete >= 50).length
  const overallHealth = Math.round((avgProgress + (goalsOnTrack / goals.length * 100)) / 2)

  // Generate AI recommendations
  const recommendations = await generateGoalRecommendations(goals, currentMetrics)

  return {
    goals,
    overallHealth,
    recommendations
  }
}

async function generateGoalRecommendations(
  goals: GoalProgressResult['goals'],
  metrics: { revenue: number; leads: number; messages: number }
): Promise<string[]> {
  const client = getAnthropic()

  const goalsummary = goals
    .map(g => `${g.name}: ${g.current}/${g.target} ${g.unit} (${g.percentComplete}%, trend: ${g.trend})`)
    .join('\n')

  const prompt = `As a business strategist, analyze these goal progress metrics and provide 3 specific, actionable recommendations:

Goals:
${goalsummary}

Current metrics:
- Revenue: $${metrics.revenue.toLocaleString()}
- Leads: ${metrics.leads}
- Messages: ${metrics.messages}

Provide exactly 3 brief recommendations (1 sentence each) to help achieve these goals. Focus on quick wins and high-impact actions.

Format as JSON array: ["recommendation1", "recommendation2", "recommendation3"]`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (textContent && textContent.type === 'text') {
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
  } catch (error) {
    console.error('Error generating goal recommendations:', error)
  }

  // Fallback recommendations
  return [
    'Follow up with recent leads within 24 hours to improve conversion',
    'Review and optimize your highest-performing customer channels',
    'Set a weekly review to track progress and adjust strategies'
  ]
}

/**
 * Generate combined insights for the business
 * Called periodically to refresh the insights cache
 */
export async function generateBusinessInsights(businessId: string): Promise<{
  opportunities: OpportunityResult[]
  seasonalInsights: SeasonalInsightResult
  goalProgress: GoalProgressResult
  generatedAt: string
}> {
  const [opportunities, seasonalInsights, goalProgress] = await Promise.all([
    detectOpportunities(businessId),
    getSeasonalInsights(businessId),
    trackGoalProgress(businessId)
  ])

  return {
    opportunities,
    seasonalInsights,
    goalProgress,
    generatedAt: new Date().toISOString()
  }
}
