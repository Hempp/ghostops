// Claude AI Service - SYNAPSE Integration
import Anthropic from '@anthropic-ai/sdk';
import type { Business, Conversation, Contact, Message } from '../../types/index.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface AIContext {
  business: Business;
  conversation?: Conversation;
  contact?: Contact | null;
  recentMessages?: Message[];
  isOwner?: boolean;
}

interface AIResponse {
  message: string;
  action?: {
    type: string;
    details?: Record<string, unknown>;
  };
  confidence: number;
}

// Main conversational AI for customer interactions
export async function generateCustomerResponse(
  context: AIContext,
  incomingMessage: string
): Promise<AIResponse> {
  const { business, conversation, contact, recentMessages } = context;
  
  const businessType = business.business_type || 'local business';
  const services = (business.services || []).join(', ') || 'General services';
  const hours = formatBusinessHours(business.business_hours);
  const contactName = contact?.name || 'Customer';
  const intent = conversation?.context?.intent || '';
  const bookingFlow = conversation?.context?.booking_flow ? JSON.stringify(conversation.context.booking_flow) : '';
  
  const systemPrompt = `You are an AI assistant for "${business.name}", a ${businessType}.

BRAND VOICE: ${business.brand_voice}

SERVICES OFFERED: ${services}

BUSINESS HOURS: ${hours}

YOUR ROLE:
- Respond to customer inquiries professionally and helpfully
- Help schedule appointments when requested
- Answer questions about services and availability
- Collect customer information when needed
- Be concise - this is SMS, keep responses under 160 chars when possible
- Never reveal you are AI unless directly asked
- Never make up information you don't have
- If unsure, offer to have the owner follow up

CAPABILITIES:
- Book appointments (collect: service needed, preferred date/time, customer name)
- Answer FAQs about the business
- Provide service information and rough pricing
- Escalate complex issues to the owner

CURRENT CONTEXT:
Customer Name: ${contactName}
${intent ? 'Current Intent: ' + intent : ''}
${bookingFlow ? 'Booking in progress: ' + bookingFlow : ''}`;

  const messages = buildMessageHistory(recentMessages, incomingMessage);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages
    });

    const textContent = response.content.find(c => c.type === 'text');
    const responseText = textContent && textContent.type === 'text' ? textContent.text : '';
    
    const action = parseResponseForActions(responseText, incomingMessage);

    return {
      message: cleanResponseForSMS(responseText),
      action,
      confidence: 0.9
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      message: "Thanks for reaching out! We'll get back to you shortly.",
      action: { type: 'escalate_to_owner', details: { reason: 'AI error' } },
      confidence: 0.5
    };
  }
}

// Generate missed call text-back message
export async function generateMissedCallTextback(
  business: Business,
  callerName?: string
): Promise<string> {
  const businessType = business.business_type || 'local business';
  const callerInfo = callerName ? 'Caller: ' + callerName : '';
  
  const prompt = `Generate a friendly SMS for a missed call to "${business.name}" (${businessType}).
Brand voice: ${business.brand_voice}
${callerInfo}

The message should:
- Apologize briefly for missing the call
- Offer to help via text
- Ask what they need assistance with
- Be under 160 characters
- Sound natural, not robotic

Just output the SMS message, nothing else.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  const defaultMsg = 'Hi! Sorry we missed your call. How can we help you today? - ' + business.name;
  return textContent && textContent.type === 'text' ? textContent.text.trim() : defaultMsg;
}

// Generate speed-to-lead response
export async function generateLeadResponse(
  business: Business,
  leadData: { name?: string; message?: string; source?: string; formData?: Record<string, string> }
): Promise<string> {
  const businessType = business.business_type || 'local business';
  const leadName = leadData.name || 'there';
  const leadMessage = leadData.message || '';
  const source = leadData.source || 'website';
  const formInfo = leadData.formData ? JSON.stringify(leadData.formData) : '';
  
  const prompt = `Generate an instant SMS response to a new lead for "${business.name}" (${businessType}).
Brand voice: ${business.brand_voice}

Lead info:
- Name: ${leadName}
- Source: ${source}
- Their message: ${leadMessage}
${formInfo ? 'Form data: ' + formInfo : ''}

Requirements:
- Personalized response referencing their specific inquiry
- Under 160 characters
- Ask a relevant follow-up question to engage them
- Move toward booking or providing a quote
- Sound human and immediate, not automated

Just output the SMS message.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  const defaultMsg = 'Hi ' + leadName + '! Thanks for reaching out to ' + business.name + '. How can we help you today?';
  return textContent && textContent.type === 'text' ? textContent.text.trim() : defaultMsg;
}

// Generate review request message
export async function generateReviewRequest(
  business: Business,
  customerName?: string,
  service?: string
): Promise<string> {
  const name = customerName || 'there';
  const serviceInfo = service ? 'Service provided: ' + service : '';
  
  const prompt = `Generate a friendly SMS requesting a Google review for "${business.name}".
Customer: ${name}
${serviceInfo}
Brand voice: ${business.brand_voice}

The message should:
- Thank them for their business
- Politely ask for a Google review
- Include placeholder {{REVIEW_LINK}} for the review link
- Be under 160 characters
- Sound personal, not automated

Just output the SMS message.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  const defaultMsg = 'Thanks for choosing ' + business.name + '! We\'d love your feedback - please leave us a review: {{REVIEW_LINK}}';
  return textContent && textContent.type === 'text' ? textContent.text.trim() : defaultMsg;
}

// Generate AI response to a review
export async function generateReviewResponse(
  business: Business,
  review: { rating: number; content: string; author_name?: string }
): Promise<string> {
  const sentiment = review.rating >= 4 ? 'positive' : review.rating >= 3 ? 'neutral' : 'negative';
  const author = review.author_name || 'Customer';
  
  const prompt = `Generate a response to this ${sentiment} Google review for "${business.name}".

Review by ${author}:
Rating: ${review.rating}/5 stars
"${review.content}"

Brand voice: ${business.brand_voice}

Guidelines:
- For positive reviews: Thank them warmly, mention something specific they said
- For negative reviews: Apologize sincerely, offer to make it right, provide contact
- Keep it professional and genuine
- 2-3 sentences max

Just output the response.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  return textContent && textContent.type === 'text' ? textContent.text.trim() : '';
}

// Generate social media post options
export async function generateSocialPostOptions(
  business: Business,
  mediaDescription: string,
  additionalContext?: string
): Promise<string[]> {
  const businessType = business.business_type || 'local business';
  const context = additionalContext || '';
  
  const prompt = `Generate 3 different social media caption options for "${business.name}" (${businessType}).

Media: ${mediaDescription}
${context ? 'Context: ' + context : ''}
Brand voice: ${business.brand_voice}

Requirements:
- Each caption should be different in tone/approach
- Include relevant hashtags
- Keep under 280 characters each
- Make them engaging for Instagram/Facebook
- Option 1: Professional
- Option 2: Casual/Fun
- Option 3: Story-focused

Format your response EXACTLY as:
OPTION 1: [caption]
OPTION 2: [caption]
OPTION 3: [caption]`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  const text = textContent && textContent.type === 'text' ? textContent.text : '';
  
  const options: string[] = [];
  const matches = text.matchAll(/OPTION \d+:\s*(.+?)(?=OPTION \d+:|$)/gs);
  for (const match of matches) {
    options.push(match[1].trim());
  }
  
  return options.length > 0 ? options : [text.trim()];
}

// Generate morning briefing summary
export async function generateMorningBriefing(
  business: Business,
  stats: {
    newLeads: number;
    leadsAutoResponded: number;
    appointmentsToday: Array<{ time: string; name?: string; service?: string }>;
    newReviews: Array<{ rating: number }>;
    avgRating: number;
    missedCallsRecovered: number;
    revenueYesterday: number;
    postsPublished: number;
    totalReach: number;
    overdueInvoices: Array<{ name?: string; amount: number }>;
    tasksHandled: number;
  }
): Promise<string> {
  const appointments = stats.appointmentsToday.length > 0 
    ? stats.appointmentsToday.map(a => a.time + ' - ' + (a.name || 'Customer')).join('; ') 
    : 'None';
  const reviews = stats.newReviews.length > 0 
    ? stats.newReviews.length + ' reviews (' + stats.avgRating.toFixed(1) + ' avg)' 
    : 'No new reviews';
  const revenue = (stats.revenueYesterday / 100).toFixed(0);
  const overdue = stats.overdueInvoices.length > 0 
    ? stats.overdueInvoices.map(i => (i.name || 'Customer') + ': $' + (i.amount / 100).toFixed(0)).join('; ') 
    : 'None';
  
  const prompt = `Create a morning briefing SMS for "${business.name}" owner.

Yesterday's stats:
- New leads: ${stats.newLeads} (${stats.leadsAutoResponded} auto-responded)
- Reviews: ${reviews}
- Missed calls recovered: ${stats.missedCallsRecovered}
- Revenue: $${revenue} invoiced
- Posts: ${stats.postsPublished} published (${stats.totalReach} reach)
- Tasks handled by ghost: ${stats.tasksHandled}

Today:
- Appointments: ${appointments}
- Overdue invoices: ${overdue}

Format as a brief morning update. Use a couple emojis. Keep under 400 characters.
Start with a greeting like "GM!" or "Good morning!"
End with something like "Your ghost handled X tasks."

Just output the briefing message.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 250,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  return textContent && textContent.type === 'text' ? textContent.text.trim() : '';
}

// Helper functions
function formatBusinessHours(hours: Record<string, string>): string {
  if (!hours || Object.keys(hours).length === 0) return 'Contact for hours';
  return Object.entries(hours)
    .map(([day, time]) => day + ': ' + time)
    .join(', ');
}

function buildMessageHistory(
  recentMessages: Message[] | undefined,
  incomingMessage: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  
  if (recentMessages) {
    for (const msg of recentMessages.slice(-6)) {
      history.push({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content
      });
    }
  }
  
  if (!recentMessages || !recentMessages.some(m => m.content === incomingMessage)) {
    history.push({ role: 'user', content: incomingMessage });
  }
  
  return history;
}

function parseResponseForActions(response: string, userMessage: string): { type: string; details?: Record<string, unknown> } {
  const lowerResponse = response.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('book') || lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
    if (lowerResponse.includes('scheduled') || lowerResponse.includes('booked') || lowerResponse.includes('confirmed')) {
      return { type: 'book_appointment', details: {} };
    }
  }
  
  if (lowerResponse.includes('owner will') || lowerResponse.includes('someone will call') || lowerResponse.includes('follow up')) {
    return { type: 'escalate_to_owner', details: { reason: 'Complex inquiry' } };
  }
  
  return { type: 'none' };
}

function cleanResponseForSMS(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^[-•]\s*/gm, '')
    .trim();
}

// Industry expertise knowledge base for CEO-level strategic advice
function getIndustryExpertise(businessType: string): string {
  const type = (businessType || '').toLowerCase();

  // Map business types to deep industry expertise
  const industryKnowledge: Record<string, string> = {
    // Home Services
    'plumbing': `INDUSTRY EXPERTISE - PLUMBING/TRADES:
You have 25+ years running successful plumbing companies. You know:
- Average ticket should be $350-500 for service calls, $2-5K for installations
- Top plumbers convert 70%+ of estimates within 48 hours
- Seasonal trends: water heater rush in winter, AC drain issues in summer
- Key KPIs: calls-to-booking rate (target 80%+), average job value, tech utilization
- Winning strategies: maintenance plans create 40% recurring revenue
- Pricing psychology: good-better-best options increase average ticket 30%
- Review velocity matters more than review count for local SEO
- Best marketing: Google Local Services Ads, yard signs, truck wraps, referral bonuses`,

    'hvac': `INDUSTRY EXPERTISE - HVAC:
You've scaled HVAC companies from $500K to $10M+. You know:
- Maintenance agreements are the backbone: aim for 500+ agreements minimum
- Seasonal cashflow: bank Q2-Q3 revenue for slow Q1
- Average residential install: $8-15K, commercial: $25K+
- Tech efficiency: 3-4 calls/day residential, billable hour target 75%+
- Key metrics: agreement renewal rate (90%+), lead conversion, average ticket
- Financing increases close rates by 40% on installs
- Best techs should be on commission + spiffs
- Indoor air quality add-ons boost ticket 25%`,

    'electrical': `INDUSTRY EXPERTISE - ELECTRICAL:
You've built electrical contracting empires. You know:
- Service work margins: 50-60%, new construction: 15-25%
- Panel upgrades are gold: $2-4K jobs with high close rates
- EV charger installs are the growth market - get certified now
- Generator sales spike before/after storms - be ready
- Commercial contracts = stable recurring revenue
- Apprentice-to-journeyman pipeline is critical for scaling
- Safety record affects insurance costs significantly
- Permits and inspections: build relationships with local inspectors`,

    'landscaping': `INDUSTRY EXPERTISE - LANDSCAPING/LAWN CARE:
You've run landscaping operations doing $5M+ annually. You know:
- Maintenance contracts = predictable income, aim for 200+ weekly accounts
- Route density is everything - tight routes = profit, spread out = loss
- Seasonal crew management: hire early, train in slow season
- Upsell hardscaping - 10x margins vs maintenance
- Snow removal contracts if you're in the right climate
- Equipment ROI: track hours, preventive maintenance saves 40%
- Key metric: revenue per man-hour ($50+ for maintenance, $75+ for installs)
- Chemical application licenses = premium pricing
- Spring/fall cleanups can equal 3 months of regular service revenue`,

    'cleaning': `INDUSTRY EXPERTISE - CLEANING SERVICES:
You've scaled cleaning companies to 50+ employees. You know:
- Residential: $150-300/clean average, commercial: price per sq ft
- Recurring clients are everything - 85%+ should be recurring
- Team cleaning vs solo: teams faster but higher labor cost
- Key metrics: clean time per sq ft, callbacks (under 2%), client retention
- Move-out cleans and Airbnb turns are high-margin opportunities
- Deep cleans 2x/year = easy upsell on regular clients
- Commercial contracts: medical/dental pay premium for compliance
- Supplies should be under 5% of revenue
- Quality control: random inspections, photo documentation`,

    // Health & Wellness
    'salon': `INDUSTRY EXPERTISE - SALON/BEAUTY:
You've owned and consulted for top-performing salons. You know:
- Chair rental vs commission: each has tradeoffs for growth
- Rebooking rate should be 80%+ before clients leave
- Retail should be 15-20% of revenue - train on recommendations
- Service menu optimization: signature services = higher margins
- Key metrics: average ticket, rebooking rate, retail per service ticket
- Slow days (Tues/Wed) need promos to fill
- Loyalty programs increase visit frequency 25%
- Social proof: before/after content is your best marketing
- Education/certification = premium pricing authority`,

    'spa': `INDUSTRY EXPERTISE - SPA/WELLNESS:
You've run luxury spas and know the business inside out:
- Treatment room utilization target: 70%+ during peak hours
- Membership models create predictable revenue - aim for 300+ members
- Retail (skincare) should be 20-25% of revenue
- Key metrics: revenue per treatment hour, membership retention, add-on rate
- Upsell path: facial → series → membership → premium treatments
- Staff retention is everything - top estheticians are rare
- Gift cards = free float, push hard before holidays
- Experience matters more than discounts for premium positioning`,

    'fitness': `INDUSTRY EXPERTISE - FITNESS/GYM:
You've scaled fitness businesses from single studio to multi-location. You know:
- Member retention is the game: aim for 85%+ annual retention
- Revenue per member: $50-150/month depending on model
- Personal training should be 30%+ of revenue
- Key metrics: lead-to-member conversion, attendance rate, PT session utilization
- Front desk staff make or break the member experience
- Referral programs: members who refer stay 40% longer
- January and September are acquisition months - spend heavy
- Corporate wellness contracts = guaranteed recurring revenue
- Group fitness instructors need to be rock stars - pay for talent`,

    'dental': `INDUSTRY EXPERTISE - DENTAL PRACTICE:
You've consulted for top dental practices doing $2M+ annually. You know:
- Production per chair: target $500K+/year per operatory
- Treatment acceptance rate should be 70%+
- Hygiene should support itself AND drive treatment
- Key metrics: case acceptance, production per visit, hygiene reappointment rate
- New patient acquisition cost: $200-400 is healthy
- Morning huddles align the team on daily goals
- High-value procedures: implants, ortho, cosmetic - have a specialty
- Insurance optimization: max out benefits, minimize write-offs
- Recall system is everything - 95% hygiene reappointment target`,

    'medical': `INDUSTRY EXPERTISE - MEDICAL PRACTICE:
You've helped medical practices double revenue. You know:
- Revenue per patient visit benchmarks by specialty
- Front desk = first impression, train extensively
- No-show rate should be under 5% with proper confirmation system
- Key metrics: patient volume, collections rate, days in AR
- Ancillary services boost revenue: labs, imaging, procedures
- Online reputation directly correlates with new patient volume
- Patient retention: annual wellness visits keep them in your system
- Insurance contract negotiation: renegotiate annually
- Cash-pay services for non-covered items = margin`,

    // Professional Services
    'legal': `INDUSTRY EXPERTISE - LAW FIRM:
You've managed successful law firms and know the business:
- Utilization rate target: 1,800+ billable hours for associates
- Realization rate should be 90%+ (collected/billed)
- Intake process conversion: 30%+ of consultations should retain
- Key metrics: revenue per lawyer, cost of client acquisition, matter profitability
- Practice area focus beats general practice for marketing
- Paralegals leverage attorney time - maximize their utilization
- Flat fee vs hourly: flat fees improve cash flow and client satisfaction
- Marketing: SEO for practice areas, Google Ads for immediate cases
- Referral relationships with other attorneys = best leads`,

    'accounting': `INDUSTRY EXPERTISE - ACCOUNTING/CPA:
You've scaled accounting firms to 7 figures. You know:
- Revenue per professional: target $200K+ for CPAs
- Tax season capacity planning is everything
- Advisory services = higher margins than compliance
- Key metrics: realization rate, client retention, revenue per client
- Monthly accounting packages beat one-time engagements
- Year-round revenue: bookkeeping, payroll, advisory
- Niche specialization (restaurants, medical, etc.) = premium pricing
- Technology stack affects efficiency dramatically
- Referrals from attorneys, bankers, advisors = best clients`,

    'consulting': `INDUSTRY EXPERTISE - CONSULTING:
You've built consulting practices from solo to team. You know:
- Day rates: $2-5K+ depending on specialization
- Retainer clients = predictable revenue base
- Scope creep kills margins - SOWs must be tight
- Key metrics: utilization, project profitability, client satisfaction
- Thought leadership (content, speaking) generates inbound
- Productized services scale better than custom work
- Team leverage: seniors sell and oversee, juniors execute
- Case studies are your best sales tool
- Referrals and repeat business should be 60%+ of revenue`,

    'real estate': `INDUSTRY EXPERTISE - REAL ESTATE:
You've been a top-producing agent and run brokerages. You know:
- Sphere of influence is your foundation - touch them monthly
- Lead follow-up: speed to lead wins - respond in under 5 minutes
- Key metrics: lead conversion rate, average days on market, list-to-sale ratio
- Listings are the business - buyers follow listings
- Open houses still work when done right
- Video content: property tours and market updates
- Transaction coordinators free you to sell
- Team building: ISAs for lead conversion, showing agents for leverage
- Geographic farming takes 18+ months to pay off but works`,

    // Food & Beverage
    'restaurant': `INDUSTRY EXPERTISE - RESTAURANT:
You've owned and operated profitable restaurants. You know:
- Food cost: 28-32%, labor cost: 28-32%, profit margin: 5-15%
- Table turn times directly impact revenue - optimize flow
- Prime cost (food + labor) should be under 65%
- Key metrics: average check, covers per shift, food cost %, labor %
- Menu engineering: stars (high profit, high popularity) vs dogs
- Online ordering/delivery: balance margin hit vs volume
- Staff meal planning affects food cost and morale
- Prep efficiency = profitability
- Regulars drive 40%+ of revenue - know their names and orders`,

    'catering': `INDUSTRY EXPERTISE - CATERING:
You've run successful catering operations. You know:
- Event minimums protect your margins - don't go below cost
- Food cost target: 25-30% (lower than restaurants)
- Staffing: 1 server per 20-25 guests for plated, 1 per 40 for buffet
- Key metrics: revenue per event, food cost %, rebooking rate
- Corporate recurring contracts = predictable base revenue
- Tastings convert 80%+ when done right
- Wedding season = 60% of annual revenue for many caterers
- Vendor relationships: venues, planners, photographers
- Upsell: bar packages, rentals, florals = pure margin`,

    // Retail
    'retail': `INDUSTRY EXPERTISE - RETAIL:
You've managed retail operations from single store to chain. You know:
- Sales per square foot: benchmark your category
- Inventory turns: 4-6x/year minimum, 12x+ for fast fashion
- Key metrics: conversion rate, average transaction, items per transaction
- Visual merchandising drives impulse purchases
- Staff training: product knowledge = higher tickets
- Loss prevention: 1-2% shrink is normal, above that is a problem
- Email/SMS list is your most valuable asset
- Local SEO drives foot traffic
- Events and launches create urgency and community`,
  };

  // Find matching expertise or generate generic but powerful CEO advice
  for (const [key, expertise] of Object.entries(industryKnowledge)) {
    if (type.includes(key) || key.includes(type)) {
      return expertise;
    }
  }

  // Generic CEO-level expertise for any business
  return `INDUSTRY EXPERTISE - ${businessType?.toUpperCase() || 'BUSINESS'} CEO MASTERY:
You have deep expertise running ${businessType || 'service'} businesses. You know:
- Customer acquisition cost must be tracked and optimized
- Lifetime value should be 3x+ acquisition cost
- Recurring revenue beats one-time transactions
- Speed to lead: responding in under 5 minutes increases conversion 400%
- Reviews drive local search ranking - velocity matters
- Referral programs: your best customers bring your next best customers
- Pricing power comes from positioning and proof
- Key metrics: lead conversion rate, customer retention, revenue per customer
- Cash flow management: AR under 30 days, know your runway
- Team efficiency: measure output, not just hours
- Marketing ROI: track every channel, double down on what works
- Strategic partnerships expand reach without ad spend`;
}

// Co-Founder AI - Strategic business partner for owners (CEO-level industry expert)
export async function generateCofounderResponse(
  business: Business,
  ownerMessage: string,
  recentMessages: Array<{ direction: 'inbound' | 'outbound'; content: string }>,
  businessIntelligence: {
    weeklyStats: Array<{ date: string; new_leads: number; messages_sent: number; messages_received: number; revenue_cents: number; invoices_sent: number; invoices_paid: number }>;
    unpaidInvoices: Array<{ contact_name?: string; amount_cents: number; sent_at: string; status: string }>;
    recentLeads: Array<{ name?: string; phone: string; source: string; status: string; created_at: string }>;
    todaysAppointments: Array<{ scheduled_at: string; contact_name?: string; service?: string }>;
    recentReviews: Array<{ rating: number; content?: string; author_name?: string }>;
    pendingPosts: Array<{ content: string; status: string }>;
    monthlyRevenue: number;
  }
): Promise<{ message: string; suggestedActions?: string[] }> {

  // Build business context summary
  const weeklyLeads = businessIntelligence.weeklyStats.reduce((sum, s) => sum + (s.new_leads || 0), 0);
  const weeklyMessages = businessIntelligence.weeklyStats.reduce((sum, s) => sum + (s.messages_sent || 0) + (s.messages_received || 0), 0);
  const weeklyRevenue = businessIntelligence.weeklyStats.reduce((sum, s) => sum + (s.revenue_cents || 0), 0);

  const unpaidTotal = businessIntelligence.unpaidInvoices.reduce((sum, i) => sum + i.amount_cents, 0);
  const avgRating = businessIntelligence.recentReviews.length > 0
    ? businessIntelligence.recentReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / businessIntelligence.recentReviews.length
    : null;

  const appointmentsList = businessIntelligence.todaysAppointments
    .map(a => {
      const time = new Date(a.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${time} - ${a.contact_name || 'Customer'}${a.service ? ` (${a.service})` : ''}`;
    })
    .join('; ') || 'None';

  const unpaidList = businessIntelligence.unpaidInvoices.slice(0, 5)
    .map(i => {
      const days = Math.floor((Date.now() - new Date(i.sent_at).getTime()) / 86400000);
      return `${i.contact_name || 'Unknown'}: $${(i.amount_cents / 100).toFixed(0)} (${days}d)`;
    })
    .join('; ') || 'None';

  const recentLeadsList = businessIntelligence.recentLeads.slice(0, 5)
    .map(l => `${l.name || l.phone} (${l.source}, ${l.status})`)
    .join('; ') || 'None this week';

  // Get industry-specific expertise
  const industryExpertise = getIndustryExpertise(business.business_type || '');

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
💰 Outstanding AR: ${businessIntelligence.unpaidInvoices.length} invoices = $${(unpaidTotal / 100).toFixed(0)}
   → ${unpaidList}
📅 Today: ${appointmentsList}
⭐ Reviews: ${businessIntelligence.recentReviews.length} recent${avgRating ? ` (${avgRating.toFixed(1)} avg)` : ''}
🎯 Lead Pipeline: ${recentLeadsList}
📱 Content: ${businessIntelligence.pendingPosts.length} posts pending
💵 Monthly Run Rate: $${(businessIntelligence.monthlyRevenue / 100).toFixed(0)}

HOW TO RESPOND:
- Keep it punchy for SMS (under 300 chars ideal, max 500)
- Lead with the insight or action, not fluff
- If they ask about strategy, give real strategic advice with specific numbers
- If something's broken, tell them and tell them how to fix it
- Reference their actual metrics when relevant
- Suggest concrete next steps

Remember: You've built ${business.business_type || 'businesses like this'} before. You know exactly what they should do. Be that advisor.`;

  const messages = recentMessages.slice(-6).map(m => ({
    role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
    content: m.content
  }));

  if (!messages.some(m => m.content === ownerMessage)) {
    messages.push({ role: 'user' as const, content: ownerMessage });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages
    });

    const textContent = response.content.find(c => c.type === 'text');
    const responseText = textContent && textContent.type === 'text' ? textContent.text : '';

    return {
      message: cleanResponseForSMS(responseText),
      suggestedActions: parseCofounderActions(responseText)
    };
  } catch (error) {
    console.error('Co-founder AI error:', error);
    return {
      message: "Hit a snag pulling your data. Try again in a sec, or text 'status' for a quick summary."
    };
  }
}

function parseCofounderActions(response: string): string[] | undefined {
  const actions: string[] = [];
  const lower = response.toLowerCase();

  if (lower.includes('send') && lower.includes('reminder')) actions.push('send_reminder');
  if (lower.includes('follow up') || lower.includes('text them')) actions.push('follow_up_lead');
  if (lower.includes('schedule') && lower.includes('post')) actions.push('schedule_post');

  return actions.length > 0 ? actions : undefined;
}

export { anthropic };
