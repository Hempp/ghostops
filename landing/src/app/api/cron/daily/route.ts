import { NextRequest, NextResponse } from 'next/server'
import Twilio from 'twilio'
import { supabase } from '@/lib/supabase'

const twilio = new Twilio.Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

// Verify cron secret to prevent unauthorized calls
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active businesses
    const { data: businesses } = await supabase
      .from('businesses')
      .select('*')
      .eq('is_active', true)
      .eq('is_paused', false)

    if (!businesses) {
      return NextResponse.json({ processed: 0 })
    }

    let processed = 0

    for (const business of businesses) {
      // Check business timezone to see if it's morning (8 AM)
      const now = new Date()
      const hour = now.getHours() // Simplified - should use timezone

      if (hour === 8) {
        await sendMorningBriefing(business)
        processed++
      }

      // Check for overdue invoices
      await checkOverdueInvoices(business)
    }

    return NextResponse.json({ processed, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Daily cron error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

async function sendMorningBriefing(business: Record<string, unknown>) {
  if (!business.owner_phone || !business.twilio_number) return

  const today = new Date().toISOString().split('T')[0]

  // Get today's appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', business.id)
    .gte('scheduled_at', `${today}T00:00:00`)
    .lte('scheduled_at', `${today}T23:59:59`)
    .order('scheduled_at')

  // Get unpaid invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', business.id)
    .in('status', ['sent', 'viewed', 'overdue'])

  const unpaidTotal = (invoices || []).reduce(
    (sum, inv) => sum + (inv.amount_cents || 0),
    0
  )

  // Build morning message
  let message = `Good morning! Here's your day:\n\n`

  if (appointments && appointments.length > 0) {
    message += `Appointments (${appointments.length}):\n`
    for (const apt of appointments.slice(0, 3)) {
      const time = new Date(apt.scheduled_at).toLocaleTimeString('en', {
        hour: 'numeric',
        minute: '2-digit',
      })
      message += `- ${time}: ${apt.contact_name || apt.contact_phone}\n`
    }
    if (appointments.length > 3) {
      message += `  ...and ${appointments.length - 3} more\n`
    }
  } else {
    message += `No appointments today.\n`
  }

  if (invoices && invoices.length > 0) {
    message += `\nUnpaid invoices: ${invoices.length} ($${(unpaidTotal / 100).toLocaleString()})\n`
  }

  message += `\nReply "more" for details or "help" for commands.`

  await twilio.messages.create({
    from: business.twilio_number as string,
    to: business.owner_phone as string,
    body: message,
  })

  console.log(`Sent morning briefing to ${business.owner_phone}`)
}

async function checkOverdueInvoices(business: Record<string, unknown>) {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // 3-day reminder
  const { data: threeDayInvoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', business.id)
    .eq('status', 'sent')
    .lt('sent_at', threeDaysAgo)
    .eq('reminder_3day_sent', false)

  for (const invoice of threeDayInvoices || []) {
    if (invoice.contact_phone && business.twilio_number) {
      await twilio.messages.create({
        from: business.twilio_number as string,
        to: invoice.contact_phone,
        body: `Hi ${invoice.contact_name || 'there'}! Just a friendly reminder about your invoice for $${(invoice.amount_cents / 100).toFixed(2)}. ${invoice.stripe_hosted_url ? `Pay here: ${invoice.stripe_hosted_url}` : 'Let us know if you have questions!'}`,
      })

      await supabase
        .from('invoices')
        .update({ reminder_3day_sent: true })
        .eq('id', invoice.id)
    }
  }

  // 7-day reminder
  const { data: sevenDayInvoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', business.id)
    .eq('status', 'sent')
    .lt('sent_at', sevenDaysAgo)
    .eq('reminder_7day_sent', false)

  for (const invoice of sevenDayInvoices || []) {
    if (invoice.contact_phone && business.twilio_number) {
      await twilio.messages.create({
        from: business.twilio_number as string,
        to: invoice.contact_phone,
        body: `Hi ${invoice.contact_name || 'there'}, your invoice for $${(invoice.amount_cents / 100).toFixed(2)} is now 7 days overdue. Please complete payment at your earliest convenience. ${invoice.stripe_hosted_url || ''}`,
      })

      await supabase
        .from('invoices')
        .update({ reminder_7day_sent: true, status: 'overdue' })
        .eq('id', invoice.id)
    }
  }
}
