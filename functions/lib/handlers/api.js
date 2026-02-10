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
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// ============================================
// REST API FOR DASHBOARD
// ============================================
exports.api = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    // Parse path
    const path = req.path.split('/').filter(Boolean);
    const [resource, id] = path;
    // Verify auth token (from Firebase Auth or API key)
    const authHeader = req.headers.authorization;
    const businessId = await verifyAuth(authHeader);
    if (!businessId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        switch (resource) {
            case 'conversations':
                await handleConversations(req, res, businessId, id);
                break;
            case 'messages':
                await handleMessages(req, res, businessId, id);
                break;
            case 'invoices':
                await handleInvoices(req, res, businessId, id);
                break;
            case 'stats':
                await handleStats(req, res, businessId);
                break;
            case 'social':
                await handleSocial(req, res, businessId, id);
                break;
            case 'business':
                await handleBusiness(req, res, businessId);
                break;
            default:
                res.status(404).json({ error: 'Not found' });
        }
    }
    catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message || 'Internal error' });
    }
});
async function verifyAuth(authHeader) {
    if (!authHeader)
        return null;
    // Handle Bearer token (Firebase Auth)
    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = await admin.auth().verifyIdToken(token);
            // Get business ID from user claims or lookup
            const userDoc = await db.collection('users').doc(decoded.uid).get();
            return userDoc.data()?.business_id || null;
        }
        catch {
            return null;
        }
    }
    // Handle API key
    if (authHeader.startsWith('ApiKey ')) {
        const apiKey = authHeader.substring(7);
        const businessSnap = await db
            .collection('businesses')
            .where('api_key', '==', apiKey)
            .limit(1)
            .get();
        return businessSnap.empty ? null : businessSnap.docs[0].id;
    }
    return null;
}
// ============================================
// CONVERSATIONS
// ============================================
async function handleConversations(req, res, businessId, conversationId) {
    if (req.method === 'GET') {
        if (conversationId) {
            const doc = await db.collection('conversations').doc(conversationId).get();
            if (!doc.exists || doc.data()?.business_id !== businessId) {
                res.status(404).json({ error: 'Not found' });
                return;
            }
            res.json({ id: doc.id, ...doc.data() });
        }
        else {
            const snapshot = await db
                .collection('conversations')
                .where('business_id', '==', businessId)
                .orderBy('last_message_at', 'desc')
                .limit(50)
                .get();
            const conversations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            res.json(conversations);
        }
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
// ============================================
// MESSAGES
// ============================================
async function handleMessages(req, res, businessId, conversationId) {
    if (req.method === 'GET' && conversationId) {
        const snapshot = await db
            .collection('messages')
            .where('conversation_id', '==', conversationId)
            .where('business_id', '==', businessId)
            .orderBy('created_at', 'asc')
            .get();
        const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        res.json(messages);
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
// ============================================
// INVOICES
// ============================================
async function handleInvoices(req, res, businessId, invoiceId) {
    if (req.method === 'GET') {
        if (invoiceId) {
            const doc = await db.collection('invoices').doc(invoiceId).get();
            if (!doc.exists || doc.data()?.business_id !== businessId) {
                res.status(404).json({ error: 'Not found' });
                return;
            }
            res.json({ id: doc.id, ...doc.data() });
        }
        else {
            const snapshot = await db
                .collection('invoices')
                .where('business_id', '==', businessId)
                .orderBy('created_at', 'desc')
                .limit(100)
                .get();
            const invoices = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            res.json(invoices);
        }
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
// ============================================
// STATS
// ============================================
async function handleStats(req, res, businessId) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const days = parseInt(req.query.days) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    const snapshot = await db
        .collection('daily_stats')
        .where('business_id', '==', businessId)
        .where('date', '>=', sinceStr)
        .orderBy('date', 'desc')
        .get();
    const stats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Aggregate totals
    const totals = stats.reduce((acc, s) => ({
        messages: acc.messages + (s.customer_messages || 0) + (s.owner_messages || 0),
        revenue: acc.revenue + (s.revenue_cents || 0),
        missed_calls: acc.missed_calls + (s.missed_calls || 0),
        new_leads: acc.new_leads + (s.new_leads || 0),
        invoices_sent: acc.invoices_sent + (s.invoices_sent || 0),
        invoices_paid: acc.invoices_paid + (s.invoices_paid || 0),
    }), { messages: 0, revenue: 0, missed_calls: 0, new_leads: 0, invoices_sent: 0, invoices_paid: 0 });
    res.json({ daily: stats, totals });
}
// ============================================
// SOCIAL
// ============================================
async function handleSocial(req, res, businessId, postId) {
    if (req.method === 'GET') {
        const snapshot = await db
            .collection('scheduled_posts')
            .where('business_id', '==', businessId)
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();
        const posts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        res.json(posts);
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
// ============================================
// BUSINESS
// ============================================
async function handleBusiness(req, res, businessId) {
    const doc = await db.collection('businesses').doc(businessId).get();
    if (!doc.exists) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    if (req.method === 'GET') {
        const data = doc.data();
        // Don't expose sensitive fields
        const { google_tokens, api_key, stripe_customer_id, ...safe } = data;
        res.json({ id: doc.id, ...safe });
    }
    else if (req.method === 'PUT') {
        const updates = req.body;
        // Only allow certain fields to be updated
        const allowed = ['name', 'email', 'industry', 'brand_voice', 'morning_briefing_enabled'];
        const filtered = {};
        for (const key of allowed) {
            if (updates[key] !== undefined) {
                filtered[key] = updates[key];
            }
        }
        await doc.ref.update(filtered);
        res.json({ success: true });
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
//# sourceMappingURL=api.js.map