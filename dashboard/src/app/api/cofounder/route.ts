import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

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

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function getIndustryExpertise(businessType: string): string {
  const type = (businessType || '').toLowerCase()

  const industryKnowledge: Record<string, string> = {
    'plumbing': `INDUSTRY EXPERTISE - PLUMBING/TRADES:
You have 25+ years running successful plumbing companies. You know:
- Average ticket should be $350-500 for service calls, $2-5K for installations
- Top plumbers convert 70%+ of estimates within 48 hours
- Emergency calls should be 30-40% markup minimum
- Membership/maintenance programs = recurring revenue gold (target 200+ members)
- Response time under 2 hours wins 80% of emergency jobs
- Google Local Services ads outperform regular PPC 3:1 for trades
- Reviews are everything - need 100+ with 4.7+ stars to dominate`,

    'hvac': `INDUSTRY EXPERTISE - HVAC:
You've scaled HVAC companies from startup to $10M+. Key benchmarks:
- Maintenance agreements should be 30%+ of revenue for stability
- Summer AC and winter heating = plan marketing 6 weeks ahead
- Average install ticket: $8-15K, service call: $150-400
- Tech utilization should be 75%+ or you're overstaffed
- Equipment rebates and financing close 40% more deals
- IAQ (indoor air quality) upsells add $500-2K per job`,

    'electrical': `INDUSTRY EXPERTISE - ELECTRICAL:
You've built electrical contracting businesses. You know:
- Panel upgrades ($2-4K) are your bread and butter
- EV charger installs are growing 40% YoY - get certified now
- Commercial contracts provide steady base, residential = higher margins
- Permit fees and inspection scheduling kill profitability if not managed
- Generator installs spike after every storm - be ready`,

    'landscaping': `INDUSTRY EXPERTISE - LANDSCAPING:
You've run landscaping operations for decades. Key insights:
- Maintenance contracts = predictable recurring revenue (aim for 60% of business)
- Seasonal work requires 6-month cash reserves minimum
- Crew efficiency: 8-10 properties/day for maintenance
- Design/build projects: 35-50% gross margins or you're underpriced
- Spring cleanup and fall leaf removal = 40% of annual residential revenue
- Water features and outdoor lighting = high-margin upsells`,

    'cleaning': `INDUSTRY EXPERTISE - CLEANING SERVICES:
You've scaled cleaning businesses. Critical metrics:
- Residential: $120-200 per clean, target 4-6 homes/cleaner/day
- Commercial: Price per sq ft, but contracts = gold
- Employee turnover kills profits - pay above market
- Supply costs should be under 5% of revenue
- Recurring clients = 80%+ of revenue for healthy business
- Move-out/deep cleans: 2-3x regular pricing`,

    'salon': `INDUSTRY EXPERTISE - SALON/BEAUTY:
You've run profitable salons. The math that matters:
- Chair rental vs commission: know your breakeven
- Retail should be 15-20% of revenue
- Rebooking rate target: 80%+ before they leave
- Average ticket varies by service - track and optimize
- Social proof (Instagram/TikTok) drives 50%+ of new clients
- No-show policy is essential - charge 50% for no-shows`,

    'restaurant': `INDUSTRY EXPERTISE - RESTAURANT:
You've operated successful restaurants. Critical numbers:
- Food cost: 28-32% or you're bleeding money
- Labor: 25-30% of revenue, watch overtime like a hawk
- Prime cost (food + labor) must stay under 60%
- Table turn times determine revenue per seat
- Online ordering = 30% of revenue for most now
- Reviews under 4.2 stars = death spiral`,

    'fitness': `INDUSTRY EXPERTISE - FITNESS/GYM:
You've built fitness businesses. Key metrics:
- Member retention > acquisition (10x cheaper to keep than get)
- Personal training = high margin profit center
- Attrition rate: target under 5% monthly
- January and September are your acquisition months
- Class capacity utilization should be 70%+
- Supplement/merchandise = easy additional revenue`,

    'dental': `INDUSTRY EXPERTISE - DENTAL PRACTICE:
You've managed dental practices. The numbers:
- Hygiene should be 30%+ of production
- Case acceptance rate target: 70%+
- New patient value: $800-1200 first year
- Recall rate: 85%+ for healthy practice
- Insurance reimbursements declining - membership plans growing
- Morning and lunch hours = premium scheduling`,

    'legal': `INDUSTRY EXPERTISE - LAW FIRM:
You've run successful law practices. Key insights:
- Billable hour targets: 1800-2000/year per attorney
- Realization rate: 90%+ or review your billing
- Client acquisition cost varies wildly by practice area
- Retainer structures = cash flow stability
- Reviews and referrals = 70%+ of new clients
- Specialization > generalization for marketing`,

    'real estate': `INDUSTRY EXPERTISE - REAL ESTATE:
You've built real estate businesses. Critical metrics:
- Lead to close ratio: 2-3% for cold leads, 20%+ for referrals
- Average days on market affects your marketing
- Sphere of influence = 80% of business for top agents
- Video content outperforms photos 3:1 for listings
- Follow-up cadence: 80% of deals close after 5+ touches
- Open houses still convert at 2-5%`,
  }

  // Find matching industry
  for (const [key, expertise] of Object.entries(industryKnowledge)) {
    if (type.includes(key) || key.includes(type)) {
      return expertise
    }
  }

  // Default business expertise
  return `GENERAL BUSINESS EXPERTISE:
You have decades of experience scaling small businesses. You know:
- Cash flow is king - AR over 30 days is a red flag
- Customer acquisition cost must be less than lifetime value
- Top 20% of customers drive 80% of revenue - know who they are
- Systems and processes scale, individual heroics don't
- Recurring revenue beats one-time sales every time
- Reviews and referrals are the cheapest growth levers`
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, businessId } = await request.json()

    if (!message || !businessId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch business data
    const db = getSupabase()
    const { data: business, error: bizError } = await db
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check AI conversation limits
    const { checkUsageLimit, incrementUsage } = await import('@/lib/usage-limits')
    const usageCheck = await checkUsageLimit(businessId, 'ai', 1)
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'AI conversation limit reached',
          message: usageCheck.message || 'You\'ve reached your AI conversation limit for this billing period. Upgrade your plan for more.',
          usageInfo: {
            current: usageCheck.currentUsage,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
          },
        },
        { status: 429 }
      )
    }

    // Fetch business intelligence in parallel
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const todayStart = new Date().toISOString().split('T')[0]

    const [statsRes, invoicesRes, leadsRes] = await Promise.all([
      db.from('daily_stats').select('*').eq('business_id', businessId).gte('date', sevenDaysAgo.split('T')[0]).order('date', { ascending: false }),
      db.from('invoices').select('*').eq('business_id', businessId).in('status', ['sent', 'overdue']),
      db.from('contacts').select('*').eq('business_id', businessId).gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(10)
    ])

    const weeklyStats = statsRes.data || []
    const unpaidInvoices = invoicesRes.data || []
    const recentLeads = leadsRes.data || []

    // Calculate metrics
    const weeklyLeads = weeklyStats.reduce((sum, s) => sum + (s.new_leads || 0), 0)
    const weeklyMessages = weeklyStats.reduce((sum, s) => sum + (s.messages_sent || 0) + (s.messages_received || 0), 0)
    const weeklyRevenue = weeklyStats.reduce((sum, s) => sum + (s.revenue_cents || 0), 0)
    const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + (i.amount_cents || 0), 0)
    const monthlyRevenue = weeklyRevenue * 4 // Rough estimate

    const unpaidList = unpaidInvoices.slice(0, 5)
      .map(i => {
        const days = Math.floor((Date.now() - new Date(i.sent_at || i.created_at).getTime()) / 86400000)
        return `${i.contact_name || 'Unknown'}: $${((i.amount_cents || 0) / 100).toFixed(0)} (${days}d)`
      })
      .join('; ') || 'None'

    const recentLeadsList = recentLeads.slice(0, 5)
      .map(l => `${l.name || l.phone} (${l.source || 'direct'}, ${l.status || 'new'})`)
      .join('; ') || 'None this week'

    const industryExpertise = getIndustryExpertise(business.business_type || '')

    const systemPrompt = `You are the AI co-founder for "${business.name}" - a ${business.business_type || 'business'}.

${industryExpertise}

YOUR IDENTITY:
You're not just an assistant - you're a battle-tested CEO who has built and scaled businesses exactly like this one. You've seen what works and what fails. You speak from experience, not theory. You're the co-founder they couldn't otherwise afford - someone who's been in the trenches and knows the playbook.

YOUR APPROACH:
- Speak like a confident CEO peer, not a subordinate
- Reference industry benchmarks and best practices naturally
- Spot opportunities others miss
- Call out problems directly - don't sugarcoat
- Give specific, actionable advice (not generic platitudes)
- Think 3 moves ahead strategically
- Celebrate wins but always push for the next level
- Use data to back up your points

CURRENT BUSINESS METRICS:
📊 This Week: ${weeklyLeads} new leads | ${weeklyMessages} messages | $${(weeklyRevenue / 100).toFixed(0)} revenue
💰 Outstanding AR: ${unpaidInvoices.length} invoices = $${(unpaidTotal / 100).toFixed(0)}
   → ${unpaidList}
🎯 Lead Pipeline: ${recentLeadsList}
💵 Monthly Run Rate: $${(monthlyRevenue / 100).toFixed(0)}

RESPOND WITH:
- Strategic insights tailored to their specific situation
- Actionable next steps they can take today
- Industry benchmarks to put their numbers in context
- Direct, confident advice like a real co-founder would give
- Keep responses conversational but substantive (2-4 paragraphs)`

    // Build messages for Claude
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role,
          content: msg.content
        })
      }
    }

    messages.push({ role: 'user', content: message })

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    })

    const textContent = response.content.find(c => c.type === 'text')
    const responseText = textContent && textContent.type === 'text' ? textContent.text : 'I apologize, I had trouble generating a response. Please try again.'

    // Increment monthly AI usage
    await incrementUsage(businessId, 'ai', 1)

    return NextResponse.json({
      message: responseText,
      metrics: {
        weeklyLeads,
        weeklyMessages,
        weeklyRevenue: weeklyRevenue / 100,
        unpaidTotal: unpaidTotal / 100,
        monthlyRevenue: monthlyRevenue / 100
      }
    })

  } catch (error) {
    console.error('Co-founder API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
