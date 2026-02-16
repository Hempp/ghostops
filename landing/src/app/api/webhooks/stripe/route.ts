import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import Twilio from 'twilio'
import {
  createBusiness,
  updateBusinessSubscription,
  markInvoicePaid,
  getBusinessByStripeCustomer,
} from '@/lib/supabase'

// Lazy initialization to avoid build-time errors
let _stripe: Stripe | null = null
let _twilio: Twilio.Twilio | null = null

function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return _stripe
}

function getTwilio() {
  if (!_twilio) {
    _twilio = new Twilio.Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
  }
  return _twilio
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // New subscription signup
      if (session.mode === 'subscription' && session.customer_email) {
        await provisionNewBusiness(session)
      }

      // Invoice payment link
      const paymentLinkId = session.payment_link as string
      if (paymentLinkId && session.amount_total) {
        await markInvoicePaid(paymentLinkId, session.amount_total)
        console.log(`Payment completed for payment link: ${paymentLinkId}`)
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionChange(subscription, event.type)
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

async function provisionNewBusiness(session: Stripe.Checkout.Session) {
  const customerEmail = session.customer_email!
  const customerPhone = session.customer_details?.phone || ''
  const customerName = session.customer_details?.name || ''
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  console.log(`Provisioning new business for: ${customerEmail}`)

  try {
    // 1. Buy a Twilio phone number
    const twilioNumber = await purchaseTwilioNumber()
    console.log(`Purchased Twilio number: ${twilioNumber}`)

    // 2. Configure the number's webhooks
    await configureTwilioWebhooks(twilioNumber)

    // 3. Create the business in Supabase
    const business = await createBusiness({
      owner_email: customerEmail,
      owner_phone: customerPhone,
      owner_name: customerName,
      twilio_number: twilioNumber,
      stripe_customer_id: customerId,
      subscription_id: subscriptionId,
    })

    // 4. Send welcome SMS
    if (customerPhone) {
      const masterNumber = process.env.TWILIO_MASTER_NUMBER || twilioNumber

      await getTwilio().messages.create({
        from: masterNumber,
        to: customerPhone,
        body: `Welcome to GhostOps!\n\nYour AI assistant number is:\n${twilioNumber}\n\nSave this number and text it anytime. Try these commands:\n\n- "what's my day"\n- "invoice John 500"\n- "post to instagram"\n\nYour customers can also text this number - I'll handle them 24/7.\n\nText your new number now to get started!`,
      })
      console.log(`Sent welcome SMS to ${customerPhone}`)
    }

    console.log(`Successfully provisioned business ${business.id}`)
  } catch (error) {
    console.error('Error provisioning business:', error)
    throw error
  }
}

async function purchaseTwilioNumber(): Promise<string> {
  const availableNumbers = await getTwilio().availablePhoneNumbers('US').local.list({
    smsEnabled: true,
    voiceEnabled: true,
    limit: 1,
  })

  if (availableNumbers.length === 0) {
    throw new Error('No available phone numbers')
  }

  const purchased = await getTwilio().incomingPhoneNumbers.create({
    phoneNumber: availableNumbers[0].phoneNumber,
    friendlyName: 'GhostOps Business Line',
  })

  return purchased.phoneNumber
}

async function configureTwilioWebhooks(phoneNumber: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ghostops.ai'

  const numbers = await getTwilio().incomingPhoneNumbers.list({
    phoneNumber: phoneNumber,
  })

  if (numbers.length === 0) {
    throw new Error(`Phone number not found: ${phoneNumber}`)
  }

  await getTwilio().incomingPhoneNumbers(numbers[0].sid).update({
    smsUrl: `${baseUrl}/api/webhooks/twilio/sms`,
    smsMethod: 'POST',
    voiceUrl: `${baseUrl}/api/webhooks/twilio/voice`,
    voiceMethod: 'POST',
  })

  console.log(`Configured webhooks for ${phoneNumber}`)
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  eventType: string
) {
  const customerId = subscription.customer as string

  const business = await getBusinessByStripeCustomer(customerId)
  if (!business) {
    console.log(`No business found for Stripe customer: ${customerId}`)
    return
  }

  const status = subscription.status
  const plan = subscription.items.data[0]?.price?.lookup_key || 'unknown'
  const subData = subscription as unknown as { current_period_end: number }

  switch (eventType) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await updateBusinessSubscription(customerId, {
        subscription_status: status,
        subscription_plan: plan,
        subscription_id: subscription.id,
        subscription_current_period_end: new Date(
          subData.current_period_end * 1000
        ).toISOString(),
      })
      console.log(`Updated subscription for business ${business.id}: ${status}`)
      break

    case 'customer.subscription.deleted':
      await updateBusinessSubscription(customerId, {
        subscription_status: 'canceled',
        subscription_canceled_at: new Date().toISOString(),
      })
      console.log(`Subscription canceled for business ${business.id}`)
      break
  }
}
