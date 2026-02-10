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
exports.storeMedia = storeMedia;
exports.getUnusedMedia = getUnusedMedia;
exports.markMediaUsed = markMediaUsed;
exports.cleanupOldMedia = cleanupOldMedia;
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const storage = admin.storage();
const db = admin.firestore();
/**
 * Downloads media from Twilio MMS and stores in Firebase Storage
 */
async function storeMedia(businessId, mediaUrl, contentType, messageId) {
    try {
        // Download from Twilio
        const response = await (0, node_fetch_1.default)(mediaUrl, {
            headers: {
                // Twilio requires basic auth for media URLs
                Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to download media: ${response.status}`);
        }
        const buffer = await response.buffer();
        // Determine file extension
        const ext = getExtensionFromContentType(contentType);
        const filename = `${messageId}_${Date.now()}${ext}`;
        const storagePath = `businesses/${businessId}/media/${filename}`;
        // Upload to Firebase Storage
        const bucket = storage.bucket();
        const file = bucket.file(storagePath);
        await file.save(buffer, {
            metadata: {
                contentType,
                metadata: {
                    businessId,
                    messageId,
                    originalUrl: mediaUrl,
                    uploadedAt: new Date().toISOString(),
                },
            },
        });
        // Make publicly accessible (or use signed URLs)
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
        // Index in Firestore for later retrieval
        await db.collection('media').add({
            business_id: businessId,
            message_id: messageId,
            storage_path: storagePath,
            public_url: publicUrl,
            content_type: contentType,
            is_video: contentType.startsWith('video/'),
            is_image: contentType.startsWith('image/'),
            used_in_post: false,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        return publicUrl;
    }
    catch (error) {
        console.error('Media storage error:', error);
        // Return original URL as fallback
        return mediaUrl;
    }
}
function getExtensionFromContentType(contentType) {
    const map = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/heic': '.heic',
        'video/mp4': '.mp4',
        'video/quicktime': '.mov',
        'video/x-msvideo': '.avi',
        'video/webm': '.webm',
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'application/pdf': '.pdf',
    };
    return map[contentType] || '.bin';
}
/**
 * Get all unused media for a business (for content planning)
 */
async function getUnusedMedia(businessId, limit = 10) {
    const snapshot = await db
        .collection('media')
        .where('business_id', '==', businessId)
        .where('used_in_post', '==', false)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}
/**
 * Mark media as used in a post
 */
async function markMediaUsed(mediaIds) {
    const batch = db.batch();
    for (const id of mediaIds) {
        batch.update(db.collection('media').doc(id), {
            used_in_post: true,
            used_at: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
}
/**
 * Delete old media (cleanup function)
 */
async function cleanupOldMedia(businessId, daysOld = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const oldMedia = await db
        .collection('media')
        .where('business_id', '==', businessId)
        .where('created_at', '<', cutoff)
        .where('used_in_post', '==', false)
        .get();
    const bucket = storage.bucket();
    const batch = db.batch();
    for (const doc of oldMedia.docs) {
        const data = doc.data();
        // Delete from storage
        try {
            await bucket.file(data.storage_path).delete();
        }
        catch (e) {
            console.error('Failed to delete file:', data.storage_path);
        }
        // Delete from Firestore
        batch.delete(doc.ref);
    }
    await batch.commit();
    return oldMedia.size;
}
//# sourceMappingURL=storage.js.map