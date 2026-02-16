// ===========================================
// STRIPE WEBHOOK ROUTES
// CIPHER Agent: Payment Processing
// ===========================================

import { Router, Request, Response } from 'express';
import { constructWebhookEvent } from '../../lib/stripe.js';
import { updateInvoice, supabase } from '../../lib/supabase.js';
import { sendSms } from '../../lib/twilio.js';
import type { Business, Invoice } from '../../types/index.js';

export const stripeRouter = Router();

// ===========================================
// STRIPE WEBHOOK HANDLER
// ===========================================

stripeRouter.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  try {
    const event = constructWebhookEvent(req.body, signature);

    console.log(`💳 Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as unknown as CheckoutSession);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as unknown as PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as unknown as PaymentIntent);
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface CheckoutSession {
  id: string;
  payment_status: string;
  amount_total: number;
  metadata: {
    business_id: string;
    invoice_id: string;
    customer_phone: string;
    customer_name: string;
  };
}

interface PaymentIntent {
  id: string;
  amount: number;
  status: string;
  metadata: {
    business_id: string;
    invoice_id: string;
    customer_phone: string;
    customer_name: string;
  };
}

// ===========================================
// EVENT HANDLERS
// ===========================================

async function handleCheckoutCompleted(session: CheckoutSession): Promise<void> {
  const { metadata, amount_total, payment_status } = session;

  if (payment_status !== 'paid') {
    console.log(`Checkout session ${session.id} not paid yet`);
    return;
  }

  const { invoice_id, business_id, customer_phone, customer_name } = metadata;

  // Update invoice status
  await updateInvoice(invoice_id, {
    status: 'paid',
    paid_at: new Date().toISOString(),
  });

  // Get business info
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', business_id)
    .single();

  if (!business) return;

  const amountDollars = (amount_total / 100).toFixed(2);

  // Notify customer
  if (customer_phone) {
    await sendSms(
      customer_phone,
      business.twilio_number,
      `✅ Payment confirmed! Thank you for your payment of $${amountDollars} to ${business.name}. We appreciate your business!`
    );
  }

  // Notify owner
  await sendSms(
    business.owner_phone,
    business.twilio_number,
    `💰 Payment received!\n${customer_name}: $${amountDollars}\n\nTotal paid today: Check your dashboard for details.`
  );

  console.log(`✅ Invoice ${invoice_id} marked as paid: $${amountDollars}`);
}

async function handlePaymentSucceeded(paymentIntent: PaymentIntent): Promise<void> {
  const { metadata, amount } = paymentIntent;
  const { invoice_id } = metadata;

  if (!invoice_id) {
    // Not an invoice payment, might be from another source
    return;
  }

  // Update invoice with payment intent ID
  await updateInvoice(invoice_id, {
    stripe_payment_intent_id: paymentIntent.id,
    status: 'paid',
    paid_at: new Date().toISOString(),
  });

  console.log(`✅ Payment intent ${paymentIntent.id} succeeded: $${amount / 100}`);
}

async function handlePaymentFailed(paymentIntent: PaymentIntent): Promise<void> {
  const { metadata } = paymentIntent;
  const { invoice_id, business_id, customer_phone } = metadata;

  if (!invoice_id) return;

  // Get business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', business_id)
    .single();

  if (!business) return;

  // Notify customer of failed payment
  if (customer_phone) {
    // Get invoice for payment link
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (invoice) {
      await sendSms(
        customer_phone,
        business.twilio_number,
        `⚠️ Your payment couldn't be processed. Please try again: ${invoice.stripe_payment_link}`
      );
    }
  }

  // Notify owner
  await sendSms(
    business.owner_phone,
    business.twilio_number,
    `⚠️ Payment failed for invoice ${invoice_id}. Customer has been notified.`
  );

  console.log(`❌ Payment failed for invoice ${invoice_id}`);
}

// ===========================================
// MANUAL INVOICE ENDPOINTS
// ===========================================

stripeRouter.post('/send-invoice', async (req: Request, res: Response) => {
  try {
    const { invoiceId, customerPhone } = req.body;

    // Get invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, businesses(*)')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const business = invoice.businesses as Business;

    // Update invoice with customer phone
    await updateInvoice(invoiceId, {
      customer_phone: customerPhone,
      status: 'sent',
    });

    // Send invoice to customer
    const amountDollars = (invoice.amount / 100).toFixed(2);
    await sendSms(
      customerPhone,
      business.twilio_number!,
      `Hi ${invoice.customer_name}! Here's your invoice from ${business.name}:\n\n` +
        `💰 $${amountDollars} - ${invoice.description}\n\n` +
        `Pay securely here: ${invoice.stripe_payment_link}`
    );

    // Notify owner
    await sendSms(
      business.owner_phone,
      business.twilio_number!,
      `📤 Invoice sent to ${invoice.customer_name} (${customerPhone}): $${amountDollars}`
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});
