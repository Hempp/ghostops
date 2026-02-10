"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const stripe_1 = __importDefault(require("stripe"));
const invoice_1 = require("../services/invoice");
const stripe = new stripe_1.default(functions.config().stripe?.secret_key || '', {
    apiVersion: '2023-10-16',
});
const webhookSecret = functions.config().stripe?.webhook_secret;
// ============================================
// STRIPE WEBHOOK
// ============================================
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig || !webhookSecret) {
        res.status(400).send('Missing signature or webhook secret');
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            // Get payment link ID from session
            const paymentLinkId = session.payment_link;
            const amountTotal = session.amount_total || 0;
            if (paymentLinkId) {
                await (0, invoice_1.markInvoicePaid)(paymentLinkId, amountTotal);
                console.log(`Payment completed for payment link: ${paymentLinkId}`);
            }
            break;
        }
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
            break;
        }
        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent failed: ${paymentIntent.id}`);
            // Could notify business owner of failed payment
            break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
            // Handle GhostOps subscription changes (for the SaaS billing)
            const subscription = event.data.object;
            await handleSubscriptionChange(subscription, event.type);
            break;
        }
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
});
async function handleSubscriptionChange(subscription, eventType) {
    const customerId = subscription.customer;
    // Look up business by Stripe customer ID
    const admin = await Promise.resolve().then(() => __importStar(require('firebase-admin')));
    const db = admin.firestore();
    const businessSnap = await db
        .collection('businesses')
        .where('stripe_customer_id', '==', customerId)
        .limit(1)
        .get();
    if (businessSnap.empty) {
        console.log(`No business found for Stripe customer: ${customerId}`);
        return;
    }
    const businessDoc = businessSnap.docs[0];
    const status = subscription.status;
    const plan = subscription.items.data[0]?.price?.lookup_key || 'unknown';
    switch (eventType) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            await businessDoc.ref.update({
                subscription_status: status,
                subscription_plan: plan,
                subscription_id: subscription.id,
                subscription_current_period_end: new Date(subscription.current_period_end * 1000),
            });
            console.log(`Updated subscription for business ${businessDoc.id}: ${status}`);
            break;
        case 'customer.subscription.deleted':
            await businessDoc.ref.update({
                subscription_status: 'canceled',
                subscription_canceled_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Subscription canceled for business ${businessDoc.id}`);
            break;
    }
}
//# sourceMappingURL=stripe.js.map