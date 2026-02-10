// Stripe Payment Service - CIPHER Transactions
import Stripe from 'stripe';
import { supabase } from '../supabase.js';
import type { Invoice, Business } from '../../types/index.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Create a payment link for an invoice
export async function createInvoicePaymentLink(
  invoice: Invoice,
  business: Business
): Promise<{ paymentLink: string; stripeInvoiceId: string }> {
  // Create or get Stripe customer
  const customers = await stripe.customers.list({
    limit: 1,
    query: `phone:'${invoice.contact_phone}'`
  });
  
  let customerId: string;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      phone: invoice.contact_phone,
      name: invoice.contact_name || undefined,
      metadata: {
        business_id: business.id,
        ghostops_contact_phone: invoice.contact_phone
      }
    });
    customerId = customer.id;
  }
  
  // Create Stripe Invoice
  const stripeInvoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: 'send_invoice',
    days_until_due: 7,
    metadata: {
      ghostops_invoice_id: invoice.id,
      business_id: business.id
    }
  });
  
  // Add line items
  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: stripeInvoice.id,
    amount: invoice.amount_cents,
    currency: 'usd',
    description: invoice.description
  });
  
  // Finalize and get hosted URL
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
  
  // Update our invoice record
  await supabase.from('invoices').update({
    stripe_invoice_id: finalizedInvoice.id,
    stripe_hosted_url: finalizedInvoice.hosted_invoice_url,
    status: 'sent',
    sent_at: new Date().toISOString()
  }).eq('id', invoice.id);
  
  return {
    paymentLink: finalizedInvoice.hosted_invoice_url || '',
    stripeInvoiceId: finalizedInvoice.id
  };
}

// Create a simple payment link (for quick invoicing)
export async function createQuickPaymentLink(
  amount: number,
  description: string,
  businessId: string
): Promise<string> {
  const product = await stripe.products.create({
    name: description,
    metadata: { business_id: businessId }
  });
  
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: 'usd'
  });
  
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { business_id: businessId }
  });
  
  return paymentLink.url;
}

// Handle Stripe webhook events
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const ghostopsInvoiceId = invoice.metadata?.ghostops_invoice_id;
      
      if (ghostopsInvoiceId) {
        await supabase.from('invoices').update({
          status: 'paid',
          paid_at: new Date().toISOString()
        }).eq('id', ghostopsInvoiceId);
        
        // Update daily stats
        const { data: inv } = await supabase
          .from('invoices')
          .select('business_id, amount_cents')
          .eq('id', ghostopsInvoiceId)
          .single();
        
        if (inv) {
          const today = new Date().toISOString().split('T')[0];
          await incrementDailyStat(inv.business_id, today, 'invoices_paid', 1);
          await incrementDailyStat(inv.business_id, today, 'revenue_cents', inv.amount_cents);
        }
      }
      break;
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const ghostopsInvoiceId = invoice.metadata?.ghostops_invoice_id;
      
      if (ghostopsInvoiceId) {
        await supabase.from('invoices').update({
          status: 'overdue'
        }).eq('id', ghostopsInvoiceId);
      }
      break;
    }
  }
}

// Verify Stripe webhook signature
export function verifyStripeSignature(
  payload: string,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

// Helper to increment daily stats
async function incrementDailyStat(
  businessId: string,
  date: string,
  field: string,
  amount: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', date)
    .single();
  
  if (existing) {
    await supabase.from('daily_stats')
      .update({ [field]: (existing as Record<string, number>)[field] + amount })
      .eq('id', existing.id);
  } else {
    await supabase.from('daily_stats')
      .insert({ business_id: businessId, date, [field]: amount });
  }
}

export { stripe };
