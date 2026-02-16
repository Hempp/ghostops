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
const twilio_1 = __importDefault(require("twilio"));
const invoice_1 = require("../services/invoice");
const stripe = new stripe_1.default(functions.config().stripe?.secret_key || '', {
    apiVersion: '2023-10-16',
});
const webhookSecret = functions.config().stripe?.webhook_secret;
// Twilio client for provisioning numbers
const twilioClient = (0, twilio_1.default)(functions.config().twilio?.account_sid || '', functions.config().twilio?.auth_token || '');
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
            // Check if this is a GhostOps subscription signup (has mode=subscription)
            if (session.mode === 'subscription' && session.customer_email) {
                await provisionNewBusiness(session);
            }
            // Handle invoice payment links
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
// ============================================
// PROVISION NEW BUSINESS
// ============================================
async function provisionNewBusiness(session) {
    const admin = await Promise.resolve().then(() => __importStar(require('firebase-admin')));
    const db = admin.firestore();
    const customerEmail = session.customer_email;
    const customerPhone = session.customer_details?.phone || '';
    const customerName = session.customer_details?.name || '';
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    console.log(`Provisioning new business for: ${customerEmail}`);
    try {
        // 1. Buy a Twilio phone number
        const twilioNumber = await purchaseTwilioNumber();
        console.log(`Purchased Twilio number: ${twilioNumber}`);
        // 2. Configure the number's webhooks
        await configureTwilioWebhooks(twilioNumber);
        // 3. Create the business in Firestore
        const businessRef = db.collection('businesses').doc();
        await businessRef.set({
            id: businessRef.id,
            owner_email: customerEmail,
            owner_phone: customerPhone,
            owner_name: customerName,
            twilio_number: twilioNumber,
            stripe_customer_id: customerId,
            subscription_id: subscriptionId,
            subscription_status: 'active',
            onboarding_step: 'welcome',
            onboarding_complete: false,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 4. Send welcome SMS to start onboarding
        if (customerPhone) {
            // Send FROM a master GhostOps number TO the customer
            // telling them their new AI number
            const masterNumber = functions.config().twilio?.master_number || twilioNumber;
            await twilioClient.messages.create({
                from: masterNumber,
                to: customerPhone,
                body: `🎉 Welcome to GhostOps!\n\nYour AI assistant number is:\n${twilioNumber}\n\nSave this number and text it anytime. Try these commands:\n\n• "what's my day"\n• "invoice John 500"\n• "post to instagram"\n• "email my accountant"\n\nYour customers can also text this number - I'll handle them 24/7 and notify you of important things.\n\nText your new number now to get started!`,
            });
            console.log(`Sent welcome SMS to ${customerPhone} with their number ${twilioNumber}`);
        }
        // 5. Send welcome email with the number
        // TODO: Integrate with SendGrid or similar
        console.log(`Successfully provisioned business ${businessRef.id} with number ${twilioNumber}`);
    }
    catch (error) {
        console.error('Error provisioning business:', error);
        // TODO: Alert support, refund customer, etc.
        throw error;
    }
}
// Purchase a local Twilio phone number
async function purchaseTwilioNumber() {
    // Search for available numbers (US by default)
    const availableNumbers = await twilioClient.availablePhoneNumbers('US')
        .local
        .list({
        smsEnabled: true,
        voiceEnabled: true,
        limit: 1,
    });
    if (availableNumbers.length === 0) {
        throw new Error('No available phone numbers');
    }
    // Purchase the number
    const purchased = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: availableNumbers[0].phoneNumber,
        friendlyName: 'GhostOps Business Line',
    });
    return purchased.phoneNumber;
}
// Configure Twilio webhooks for the new number
async function configureTwilioWebhooks(phoneNumber) {
    const projectId = process.env.GCLOUD_PROJECT || 'ghostops-sms';
    const baseUrl = `https://us-central1-${projectId}.cloudfunctions.net`;
    // Find the phone number SID
    const numbers = await twilioClient.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber,
    });
    if (numbers.length === 0) {
        throw new Error(`Phone number not found: ${phoneNumber}`);
    }
    // Update the webhooks
    await twilioClient.incomingPhoneNumbers(numbers[0].sid).update({
        smsUrl: `${baseUrl}/twilioSms`,
        smsMethod: 'POST',
        voiceUrl: `${baseUrl}/twilioVoice`,
        voiceMethod: 'POST',
    });
    console.log(`Configured webhooks for ${phoneNumber}`);
}
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