import { NextRequest, NextResponse } from 'next/server'
import Twilio from 'twilio'
import {
  getBusinessByTwilioNumber,
  getOrCreateConversation,
  saveMessage,
  recordMissedCall,
  updateMissedCallStatus,
  updateDailyStats,
} from '@/lib/supabase'
import { orchestrate } from '@/lib/orchestrator'

const twilio = new Twilio.Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const From = formData.get('From') as string
    const To = formData.get('To') as string
    const CallSid = formData.get('CallSid') as string

    // Find business
    const business = await getBusinessByTwilioNumber(To)
    if (!business) {
      return new NextResponse('<Response><Reject/></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Log missed call
    await recordMissedCall({
      business_id: business.id,
      caller_phone: From,
      twilio_call_sid: CallSid,
    })

    // Generate text-back message
    const textback = await orchestrate({
      businessId: business.id,
      business,
      conversationId: null,
      message: '__MISSED_CALL__',
      mediaUrls: [],
      isOwner: false,
      phone: From,
    })

    if (textback.reply) {
      // Send text-back
      await twilio.messages.create({
        body: textback.reply,
        from: To,
        to: From,
      })

      // Create conversation for follow-up
      const conversation = await getOrCreateConversation(
        business.id,
        From,
        'missed_call'
      )

      await saveMessage({
        conversation_id: conversation.id,
        business_id: business.id,
        direction: 'outbound',
        content: textback.reply,
        ai_generated: true,
        metadata: { intent: 'missed_call_recovery' },
      })

      // Update missed call status
      await updateMissedCallStatus(business.id, From, {
        textback_sent: true,
        conversation_id: conversation.id,
      })
    }

    // Update stats
    await updateDailyStats(business.id, 'missed_calls')

    // TwiML response - apologize and hang up
    return new NextResponse(
      `<Response>
        <Say>Sorry, we missed your call. We just texted you - please check your messages.</Say>
        <Hangup/>
      </Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error) {
    console.error('Voice webhook error:', error)
    return new NextResponse('<Response><Hangup/></Response>', {
      status: 500,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
