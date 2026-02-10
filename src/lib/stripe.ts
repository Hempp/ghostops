// ===========================================
// STRIPE SERVICE
// CIPHER Agent: Payment Integration
// ===========================================

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

// ===========================================
// PAYMENT LINKS
// ===========================================

export async function createPaymentLink(
  amount: number, // in cents
  description: string,
  customerName: string,
  metadata: {
    businessId: string;
    invoiceId: string;
    customerPhone: string;
  }
): Promise<string> {
  // Create a product for this invoice
  const product = await stripe.products.create({
    name: description,
    metadata: {
      business_id: metadata.businessId,
      invoice_id: metadata.invoiceId,
    },
  });

  // Create a price for the product
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: 'usd',
  });

  // Create the payment link
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    metadata: {
      business_id: metadata.businessId,
      invoice_id: metadata.invoiceId,
      customer_phone: metadata.customerPhone,
      customer_name: customerName,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `${process.env.DASHBOARD_URL}/payment-success?invoice=${metadata.invoiceId}`,
      },
    },
    // Collect customer info
    billing_address_collection: 'auto',
    phone_number_collection: {
      enabled: true,
    },
  });

  return paymentLink.url;
}

// ===========================================
// CONNECTED ACCOUNTS (for marketplace model)
// ===========================================

export async function createConnectedAccount(
  businessEmail: string,
  businessName: string
): Promise<string> {
  const account = await stripe.accounts.create({
    type: 'express',
    email: businessEmail,
    business_profile: {
      name: businessName,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  return account.id;
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

export async function getAccountStatus(
  accountId: string
): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}> {
  const account = await stripe.accounts.retrieve(accountId);

  return {
    chargesEnabled: account.charges_enabled || false,
    payoutsEnabled: account.payouts_enabled || false,
    detailsSubmitted: account.details_submitted || false,
  };
}

// ===========================================
// WEBHOOK HANDLING
// ===========================================

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

export async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<{
  invoiceId: string;
  businessId: string;
  customerPhone: string;
  amount: number;
}> {
  const metadata = paymentIntent.metadata;

  return {
    invoiceId: metadata.invoice_id,
    businessId: metadata.business_id,
    customerPhone: metadata.customer_phone,
    amount: paymentIntent.amount,
  };
}

// ===========================================
// INVOICE RETRIEVAL
// ===========================================

export async function getPaymentLinkStats(
  paymentLinkId: string
): Promise<{
  active: boolean;
  totalClicks: number;
  completedPayments: number;
}> {
  const paymentLink = await stripe.paymentLinks.retrieve(paymentLinkId);

  // Get associated checkout sessions
  const sessions = await stripe.checkout.sessions.list({
    payment_link: paymentLinkId,
    limit: 100,
  });

  const completedPayments = sessions.data.filter(
    (s) => s.payment_status === 'paid'
  ).length;

  return {
    active: paymentLink.active,
    totalClicks: sessions.data.length,
    completedPayments,
  };
}

// ===========================================
// REFUNDS
// ===========================================

export async function createRefund(
  paymentIntentId: string,
  amount?: number // partial refund in cents, omit for full
): Promise<Stripe.Refund> {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amount) {
    refundParams.amount = amount;
  }

  return await stripe.refunds.create(refundParams);
}

// ===========================================
// REVENUE REPORTING
// ===========================================

export async function getRevenueForPeriod(
  startDate: Date,
  endDate: Date,
  businessId?: string
): Promise<{
  totalRevenue: number;
  transactionCount: number;
  averageTransaction: number;
}> {
  const params: Stripe.PaymentIntentListParams = {
    created: {
      gte: Math.floor(startDate.getTime() / 1000),
      lte: Math.floor(endDate.getTime() / 1000),
    },
    limit: 100,
  };

  const paymentIntents = await stripe.paymentIntents.list(params);

  let filtered = paymentIntents.data.filter(
    (pi) => pi.status === 'succeeded'
  );

  if (businessId) {
    filtered = filtered.filter(
      (pi) => pi.metadata.business_id === businessId
    );
  }

  const totalRevenue = filtered.reduce((sum, pi) => sum + pi.amount, 0);
  const transactionCount = filtered.length;

  return {
    totalRevenue: totalRevenue / 100,
    transactionCount,
    averageTransaction:
      transactionCount > 0 ? totalRevenue / 100 / transactionCount : 0,
  };
}
