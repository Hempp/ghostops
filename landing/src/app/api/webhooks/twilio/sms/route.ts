import { NextRequest, NextResponse } from 'next/server'
import Twilio from 'twilio'
import {
  getBusinessByTwilioNumber,
  getOrCreateConversation,
  saveMessage,
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
    const Body = formData.get('Body') as string
    const MessageSid = formData.get('MessageSid') as string
    const NumMedia = formData.get('NumMedia') as string

    // Find business by Twilio number
    const business = await getBusinessByTwilioNumber(To)
    if (!business) {
      console.error('No business found for number:', To)
      return new NextResponse('<Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const isOwner = From === business.owner_phone

    // Handle MMS media
    const mediaUrls: string[] = []
    const numMedia = parseInt(NumMedia || '0', 10)
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = formData.get(`MediaUrl${i}`) as string
      if (mediaUrl) mediaUrls.push(mediaUrl)
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(business.id, From)

    // Store incoming message
    await saveMessage({
      conversation_id: conversation.id,
      business_id: business.id,
      direction: 'inbound',
      content: Body,
      media_urls: mediaUrls,
      twilio_sid: MessageSid,
      ai_generated: false,
    })

    // Route through orchestrator
    const response = await orchestrate({
      businessId: business.id,
      business,
      conversationId: conversation.id,
      message: Body,
      mediaUrls,
      isOwner,
      phone: From,
    })

    // Send response via Twilio
    if (response.reply) {
      await twilio.messages.create({
        body: response.reply,
        from: To,
        to: From,
      })

      // Store outgoing message
      await saveMessage({
        conversation_id: conversation.id,
        business_id: business.id,
        direction: 'outbound',
        content: response.reply,
        ai_generated: true,
        metadata: { intent: response.intent },
      })
    }

    // Update daily stats
    await updateDailyStats(
      business.id,
      isOwner ? 'messages_sent' : 'messages_received'
    )

    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('SMS webhook error:', error)
    return new NextResponse('<Response></Response>', {
      status: 500,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
