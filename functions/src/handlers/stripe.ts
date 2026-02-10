import * as functions from 'firebase-functions'
import Stripe from 'stripe'
import { markInvoicePaid } from '../services/invoice'

const stripe = new Stripe(functions.config().stripe?.secret_key || '', {
  apiVersion: '2023-10-16',
})

const webhookSecret = functions.config().stripe?.webhook_secret

// ============================================
// STRIPE WEBHOOK
// ============================================
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string

  if (!sig || !webhookSecret) {
    res.status(400).send('Missing signature or webhook secret')
    return
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
    return
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // Get payment link ID from session
      const paymentLinkId = session.payment_link as string
      const amountTotal = session.amount_total || 0

      if (paymentLinkId) {
        await markInvoicePaid(paymentLinkId, amountTotal)
        console.log(`Payment completed for payment link: ${paymentLinkId}`)
      }
      break
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log(`PaymentIntent succeeded: ${paymentIntent.id}`)
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log(`PaymentIntent failed: ${paymentIntent.id}`)
      // Could notify business owner of failed payment
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // Handle GhostOps subscription changes (for the SaaS billing)
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionChange(subscription, event.type)
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  res.json({ received: true })
})

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  eventType: string
) {
  const customerId = subscription.customer as string

  // Look up business by Stripe customer ID
  const admin = await import('firebase-admin')
  const db = admin.firestore()

  const businessSnap = await db
    .collection('businesses')
    .where('stripe_customer_id', '==', customerId)
    .limit(1)
    .get()

  if (businessSnap.empty) {
    console.log(`No business found for Stripe customer: ${customerId}`)
    return
  }

  const businessDoc = businessSnap.docs[0]

  const status = subscription.status
  const plan = subscription.items.data[0]?.price?.lookup_key || 'unknown'

  switch (eventType) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await businessDoc.ref.update({
        subscription_status: status,
        subscription_plan: plan,
        subscription_id: subscription.id,
        subscription_current_period_end: new Date(subscription.current_period_end * 1000),
      })
      console.log(`Updated subscription for business ${businessDoc.id}: ${status}`)
      break

    case 'customer.subscription.deleted':
      await businessDoc.ref.update({
        subscription_status: 'canceled',
        subscription_canceled_at: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log(`Subscription canceled for business ${businessDoc.id}`)
      break
  }
}
