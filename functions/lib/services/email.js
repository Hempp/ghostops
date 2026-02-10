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
exports.handleEmail = handleEmail;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const db = admin.firestore();
const anthropic = new sdk_1.default({
    apiKey: functions.config().anthropic?.api_key,
});
async function handleEmail(businessId, message, intent) {
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    const business = businessDoc.data();
    if (!business?.google_tokens) {
        return {
            reply: "I don't have access to your email yet. Tap this link to connect: [OAuth link]",
            intent,
        };
    }
    const auth = new googleapis_1.google.auth.OAuth2(functions.config().google?.client_id, functions.config().google?.client_secret);
    auth.setCredentials(business.google_tokens);
    const gmail = googleapis_1.google.gmail({ version: 'v1', auth });
    if (intent === 'email_query') {
        return queryEmails(gmail, message);
    }
    else {
        return sendEmail(gmail, businessId, message);
    }
}
async function queryEmails(gmail, message) {
    // Extract who the user is asking about
    const extraction = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        system: `Extract the person's name or email the user is asking about.
Respond as JSON: {"query": "from:name OR subject containing name", "name": "the person"}`,
        messages: [{ role: 'user', content: message }],
    });
    try {
        const { query, name } = JSON.parse(extraction.content[0].text);
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 5,
        });
        const messages = response.data.messages || [];
        if (messages.length === 0) {
            return {
                reply: `No recent emails from ${name} found.`,
                intent: 'email_query',
            };
        }
        // Get message details
        const emailSummaries = await Promise.all(messages.slice(0, 3).map(async (msg) => {
            const full = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'metadata',
                metadataHeaders: ['Subject', 'From', 'Date'],
            });
            const headers = full.data.payload.headers;
            const subject = headers.find((h) => h.name === 'Subject')?.value || 'No subject';
            const date = headers.find((h) => h.name === 'Date')?.value || '';
            const dateStr = new Date(date).toLocaleDateString('en', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            });
            return `• ${dateStr}: ${subject}`;
        }));
        return {
            reply: `Recent emails from ${name}:\n${emailSummaries.join('\n')}\n\nWant me to reply to any?`,
            intent: 'email_query',
        };
    }
    catch (error) {
        console.error('Email query error:', error);
        return {
            reply: "Couldn't search emails. Try again?",
            intent: 'email_query',
        };
    }
}
async function sendEmail(gmail, businessId, message) {
    // Extract email details
    const extraction = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: `Extract email details from the message.
Respond as JSON: {"to": "email or name", "subject": "...", "body": "the message content"}
If only a name is given, note we'll need to look up their email.
Generate a professional but friendly email body based on the user's intent.`,
        messages: [{ role: 'user', content: message }],
    });
    try {
        const details = JSON.parse(extraction.content[0].text);
        // Look up contact email if needed
        let toEmail = details.to;
        if (!toEmail.includes('@')) {
            const contactSnap = await db
                .collection('contacts')
                .where('business_id', '==', businessId)
                .where('name', '==', details.to)
                .limit(1)
                .get();
            if (contactSnap.empty) {
                return {
                    reply: `I don't have an email for ${details.to}. What's their email address?`,
                    intent: 'email_send',
                };
            }
            toEmail = contactSnap.docs[0].data().email;
        }
        // Compose email
        const email = [
            `To: ${toEmail}`,
            `Subject: ${details.subject}`,
            '',
            details.body,
        ].join('\n');
        const encodedEmail = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail,
            },
        });
        // Truncate body for SMS confirmation
        const bodyPreview = details.body.length > 100 ? details.body.substring(0, 100) + '...' : details.body;
        return {
            reply: `Sent to ${details.to}:\n"${bodyPreview}" ✅`,
            intent: 'email_send',
            actions: [{ type: 'email_sent', to: toEmail }],
        };
    }
    catch (error) {
        console.error('Email send error:', error);
        return {
            reply: "Couldn't send that email. Check the address and try again.",
            intent: 'email_send',
        };
    }
}
//# sourceMappingURL=email.js.map