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

// Pricing plans
const PLANS = {
  starter: {
    name: 'Starter',
    price: 7900, // $79 in cents
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  pro: {
    name: 'Pro',
    price: 19700, // $197 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  agency: {
    name: 'Agency',
    price: 49900, // $499 in cents
    priceId: process.env.STRIPE_AGENCY_PRICE_ID,
  },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan = 'starter' } = body

    const selectedPlan = PLANS[plan as keyof typeof PLANS] || PLANS.starter

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
