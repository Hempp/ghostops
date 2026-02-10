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
exports.twilioVoice = exports.twilioSms = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const twilio_1 = require("twilio");
const orchestrator_1 = require("../services/orchestrator");
const storage_1 = require("../services/storage");
const db = admin.firestore();
const twilio = new twilio_1.Twilio(functions.config().twilio?.account_sid, functions.config().twilio?.auth_token);
// ============================================
// SMS/MMS WEBHOOK
// ============================================
exports.twilioSms = functions.https.onRequest(async (req, res) => {
    const { From, To, Body, NumMedia, MessageSid } = req.body;
    try {
        // Find business by Twilio number
        const businessSnap = await db
            .collection('businesses')
            .where('twilio_number', '==', To)
            .limit(1)
            .get();
        if (businessSnap.empty) {
            console.error('No business found for number:', To);
            res.status(200).send('<Response></Response>');
            return;
        }
        const business = { id: businessSnap.docs[0].id, ...businessSnap.docs[0].data() };
        const isOwner = From === business.owner_phone;
        // Handle MMS media
        const mediaUrls = [];
        const numMedia = parseInt(NumMedia || '0', 10);
        for (let i = 0; i < numMedia; i++) {
            const mediaUrl = req.body[`MediaUrl${i}`];
            const mediaType = req.body[`MediaContentType${i}`];
            // Store in Firebase Storage
            const storedUrl = await (0, storage_1.storeMedia)(business.id, mediaUrl, mediaType, MessageSid);
            mediaUrls.push(storedUrl);
        }
        // Get or create conversation
        let conversationRef;
        const existingConv = await db
            .collection('conversations')
            .where('business_id', '==', business.id)
            .where('phone', '==', From)
            .where('status', '==', 'active')
            .limit(1)
            .get();
        if (existingConv.empty) {
            conversationRef = await db.collection('conversations').add({
                business_id: business.id,
                phone: From,
                status: 'active',
                is_owner: isOwner,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                last_message_at: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        else {
            conversationRef = existingConv.docs[0].ref;
            await conversationRef.update({
                last_message_at: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        // Store incoming message
        await db.collection('messages').add({
            conversation_id: conversationRef.id,
            business_id: business.id,
            direction: 'inbound',
            content: Body,
            media_urls: mediaUrls,
            phone: From,
            is_owner: isOwner,
            ai_generated: false,
            twilio_sid: MessageSid,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Route through orchestrator
        const response = await (0, orchestrator_1.orchestrate)({
            businessId: business.id,
            business,
            conversationId: conversationRef.id,
            message: Body,
            mediaUrls,
            isOwner,
            phone: From,
        });
        // Send response via Twilio
        if (response.reply) {
            await twilio.messages.create({
                body: response.reply,
                from: To,
                to: From,
            });
            // Store outgoing message
            await db.collection('messages').add({
                conversation_id: conversationRef.id,
                business_id: business.id,
                direction: 'outbound',
                content: response.reply,
                phone: From,
                is_owner: isOwner,
                ai_generated: true,
                intent: response.intent,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        // Update daily stats
        await updateDailyStats(business.id, isOwner ? 'owner_messages' : 'customer_messages');
        res.status(200).send('<Response></Response>');
    }
    catch (error) {
        console.error('SMS handler error:', error);
        res.status(500).send('<Response></Response>');
    }
});
// ============================================
// VOICE WEBHOOK (Missed Call Handler)
// ============================================
exports.twilioVoice = functions.https.onRequest(async (req, res) => {
    const { From, To } = req.body;
    try {
        // Find business
        const businessSnap = await db
            .collection('businesses')
            .where('twilio_number', '==', To)
            .limit(1)
            .get();
        if (businessSnap.empty) {
            res.status(200).send('<Response><Reject/></Response>');
            return;
        }
        const business = { id: businessSnap.docs[0].id, ...businessSnap.docs[0].data() };
        // Log missed call
        await db.collection('missed_calls').add({
            business_id: business.id,
            phone: From,
            status: 'pending',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Send instant text-back
        const textback = await (0, orchestrator_1.orchestrate)({
            businessId: business.id,
            business,
            conversationId: null,
            message: '__MISSED_CALL__',
            mediaUrls: [],
            isOwner: false,
            phone: From,
        });
        if (textback.reply) {
            await twilio.messages.create({
                body: textback.reply,
                from: To,
                to: From,
            });
            // Create conversation for follow-up
            const convRef = await db.collection('conversations').add({
                business_id: business.id,
                phone: From,
                status: 'active',
                source: 'missed_call',
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                last_message_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('messages').add({
                conversation_id: convRef.id,
                business_id: business.id,
                direction: 'outbound',
                content: textback.reply,
                phone: From,
                ai_generated: true,
                intent: 'missed_call_recovery',
                created_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Update missed call status
            await db
                .collection('missed_calls')
                .where('business_id', '==', business.id)
                .where('phone', '==', From)
                .where('status', '==', 'pending')
                .limit(1)
                .get()
                .then((snap) => {
                if (!snap.empty) {
                    snap.docs[0].ref.update({ status: 'texted', texted_at: admin.firestore.FieldValue.serverTimestamp() });
                }
            });
        }
        // Update stats
        await updateDailyStats(business.id, 'missed_calls');
        // Reject the call (send to voicemail or just end)
        res.status(200).send(`
      <Response>
        <Say>Sorry, we missed your call. We just texted you - please check your messages.</Say>
        <Hangup/>
      </Response>
    `);
    }
    catch (error) {
        console.error('Voice handler error:', error);
        res.status(200).send('<Response><Hangup/></Response>');
    }
});
// Helper to update daily stats
async function updateDailyStats(businessId, field) {
    const today = new Date().toISOString().split('T')[0];
    const statsRef = db.collection('daily_stats').doc(`${businessId}_${today}`);
    await statsRef.set({
        business_id: businessId,
        date: today,
        [field]: admin.firestore.FieldValue.increment(1),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
//# sourceMappingURL=twilio.js.map