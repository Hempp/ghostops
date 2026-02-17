import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe lazily to avoid build-time errors
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(key, {
    apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
  })
}

// Pricing plans - Updated Feb 2026
const PLANS = {
  starter: {
    name: 'Starter',
    price: 2900, // $29 in cents
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: {
      smsLimit: 100,
      aiConversations: 50,
      phoneNumbers: 1,
      contacts: 250,
    },
  },
  growth: {
    name: 'Growth',
    price: 7900, // $79 in cents
    priceId: process.env.STRIPE_GROWTH_PRICE_ID,
    features: {
      smsLimit: 500,
      aiConversations: 200,
      phoneNumbers: 2,
      contacts: 2500,
    },
  },
  pro: {
    name: 'Pro',
    price: 19900, // $199 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      smsLimit: 2000,
      aiConversations: -1, // unlimited
      phoneNumbers: 5,
      contacts: -1, // unlimited
    },
  },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan } = body

    // Validate plan is provided and valid
    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${Object.keys(PLANS).join(', ')}` },
        { status: 400 }
      )
    }

    const selectedPlan = PLANS[plan as keyof typeof PLANS]

    // Validate priceId is configured
    if (!selectedPlan.priceId) {
      console.error(`Missing price ID for plan: ${plan}`)
      return NextResponse.json(
        { error: 'Plan pricing not configured. Please contact support.' },
        { status: 500 }
      )
    }

    const stripe = getStripe()

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      // Collect phone number for SMS onboarding
      phone_number_collection: {
        enabled: true,
      },
      // Success and cancel URLs
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/#pricing`,
      // Metadata for provisioning
      metadata: {
        plan: plan,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Billing address collection
      billing_address_collection: 'required',
      // Customer creation
      customer_creation: 'always',
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
