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
exports.handleInvoice = handleInvoice;
exports.markInvoicePaid = markInvoicePaid;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const twilio_1 = require("twilio");
const db = admin.firestore();
const stripe = new stripe_1.default(functions.config().stripe?.secret_key || '', {
    apiVersion: '2023-10-16',
});
const twilio = new twilio_1.Twilio(functions.config().twilio?.account_sid, functions.config().twilio?.auth_token);
const anthropic = new sdk_1.default({
    apiKey: functions.config().anthropic?.api_key,
});
async function handleInvoice(businessId, message, intent, ownerPhone) {
    if (intent === 'invoice_query') {
        return queryInvoices(businessId);
    }
    else {
        return createInvoice(businessId, message, ownerPhone);
    }
}
async function queryInvoices(businessId) {
    const invoicesSnap = await db
        .collection('invoices')
        .where('business_id', '==', businessId)
        .where('status', 'in', ['sent', 'viewed', 'overdue'])
        .orderBy('created_at', 'desc')
        .limit(10)
        .get();
    const invoices = invoicesSnap.docs.map((d) => d.data());
    if (invoices.length === 0) {
        return {
            reply: "No unpaid invoices. You're all caught up! 💰",
            intent: 'invoice_query',
        };
    }
    const totalUnpaid = invoices.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0);
    const invoiceList = invoices
        .slice(0, 5)
        .map((inv) => {
        const status = inv.status === 'overdue' ? '⚠️' : '📋';
        return `${status} ${inv.contact_name || inv.contact_phone}: $${(inv.amount_cents / 100).toFixed(0)}`;
    })
        .join('\n');
    return {
        reply: `${invoices.length} unpaid invoice${invoices.length > 1 ? 's' : ''} ($${(totalUnpaid / 100).toLocaleString()} total):\n` +
            `${invoiceList}\n\n` +
            `Want me to send reminders?`,
        intent: 'invoice_query',
    };
}
async function createInvoice(businessId, message, ownerPhone) {
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    const business = businessDoc.data();
    // Extract invoice details with Claude
    const extraction = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `Extract invoice details from the message.
Respond as JSON: {"name": "customer name", "phone": "phone if mentioned", "amount": number in dollars, "description": "service description"}
If phone not mentioned, leave it null.`,
        messages: [{ role: 'user', content: message }],
    });
    try {
        const details = JSON.parse(extraction.content[0].text);
        const amountCents = Math.round(details.amount * 100);
        // Look up or create contact
        let contactPhone = details.phone;
        if (!contactPhone && details.name) {
            const contactSnap = await db
                .collection('contacts')
                .where('business_id', '==', businessId)
                .where('name', '==', details.name)
                .limit(1)
                .get();
            if (!contactSnap.empty) {
                contactPhone = contactSnap.docs[0].data().phone;
            }
        }
        if (!contactPhone) {
            return {
                reply: `Got it - $${details.amount} for ${details.name}. What's their phone number so I can send the invoice?`,
                intent: 'invoice_create',
            };
        }
        // Create Stripe price and payment link
        const price = await stripe.prices.create({
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
                name: details.description || `Invoice from ${business?.name || 'GhostOps Business'}`,
            },
        });
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: 1 }],
            metadata: {
                business_id: businessId,
                contact_phone: contactPhone,
            },
        });
        // Store invoice
        const invoiceRef = await db.collection('invoices').add({
            business_id: businessId,
            contact_name: details.name,
            contact_phone: contactPhone,
            amount_cents: amountCents,
            description: details.description,
            status: 'sent',
            stripe_payment_link: paymentLink.url,
            stripe_payment_link_id: paymentLink.id,
            sent_at: admin.firestore.FieldValue.serverTimestamp(),
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Send invoice via SMS
        const invoiceMessage = `Hi ${details.name}! Here's your invoice from ${business?.name || 'us'}:\n\n` +
            `${details.description}: $${details.amount}\n\n` +
            `Pay securely here: ${paymentLink.url}\n\n` +
            `Thanks for your business!`;
        await twilio.messages.create({
            body: invoiceMessage,
            from: business?.twilio_number,
            to: contactPhone,
        });
        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        await db
            .collection('daily_stats')
            .doc(`${businessId}_${today}`)
            .set({
            business_id: businessId,
            date: today,
            invoices_sent: admin.firestore.FieldValue.increment(1),
            invoices_amount_sent: admin.firestore.FieldValue.increment(amountCents),
        }, { merge: true });
        return {
            reply: `Done! Invoice sent to ${details.name} for $${details.amount}.\n` +
                `They'll get a payment link via text. I'll remind them in 3 days if unpaid. ✅`,
            intent: 'invoice_create',
            actions: [{ type: 'invoice_created', invoice_id: invoiceRef.id }],
        };
    }
    catch (error) {
        console.error('Invoice create error:', error);
        return {
            reply: "Couldn't create that invoice. Try: 'invoice [name] $[amount] for [service]'",
            intent: 'invoice_create',
        };
    }
}
// Called by Stripe webhook when payment succeeds
async function markInvoicePaid(paymentLinkId, amountCents) {
    const invoiceSnap = await db
        .collection('invoices')
        .where('stripe_payment_link_id', '==', paymentLinkId)
        .limit(1)
        .get();
    if (invoiceSnap.empty)
        return;
    const invoiceDoc = invoiceSnap.docs[0];
    const invoice = invoiceDoc.data();
    await invoiceDoc.ref.update({
        status: 'paid',
        paid_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    await db
        .collection('daily_stats')
        .doc(`${invoice.business_id}_${today}`)
        .set({
        business_id: invoice.business_id,
        date: today,
        invoices_paid: admin.firestore.FieldValue.increment(1),
        revenue_cents: admin.firestore.FieldValue.increment(amountCents),
    }, { merge: true });
    // Notify business owner
    const businessDoc = await db.collection('businesses').doc(invoice.business_id).get();
    const business = businessDoc.data();
    if (business?.owner_phone && business?.twilio_number) {
        await twilio.messages.create({
            body: `💰 Payment received! ${invoice.contact_name} paid $${(amountCents / 100).toFixed(2)} for "${invoice.description}"`,
            from: business.twilio_number,
            to: business.owner_phone,
        });
    }
}
//# sourceMappingURL=invoice.js.map