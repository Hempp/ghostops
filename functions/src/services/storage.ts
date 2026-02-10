import * as admin from 'firebase-admin'
import fetch from 'node-fetch'

const storage = admin.storage()
const db = admin.firestore()

/**
 * Downloads media from Twilio MMS and stores in Firebase Storage
 */
export async function storeMedia(
  businessId: string,
  mediaUrl: string,
  contentType: string,
  messageId: string
): Promise<string> {
  try {
    // Download from Twilio
    const response = await fetch(mediaUrl, {
      headers: {
        // Twilio requires basic auth for media URLs
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64')}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`)
    }

    const buffer = await response.buffer()

    // Determine file extension
    const ext = getExtensionFromContentType(contentType)
    const filename = `${messageId}_${Date.now()}${ext}`
    const storagePath = `businesses/${businessId}/media/${filename}`

    // Upload to Firebase Storage
    const bucket = storage.bucket()
    const file = bucket.file(storagePath)

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
    })

    // Make publicly accessible (or use signed URLs)
    await file.makePublic()

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`

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
    })

    return publicUrl
  } catch (error) {
    console.error('Media storage error:', error)
    // Return original URL as fallback
    return mediaUrl
  }
}

function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
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
  }
  return map[contentType] || '.bin'
}

/**
 * Get all unused media for a business (for content planning)
 */
export async function getUnusedMedia(businessId: string, limit = 10) {
  const snapshot = await db
    .collection('media')
    .where('business_id', '==', businessId)
    .where('used_in_post', '==', false)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get()

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

/**
 * Mark media as used in a post
 */
export async function markMediaUsed(mediaIds: string[]) {
  const batch = db.batch()

  for (const id of mediaIds) {
    batch.update(db.collection('media').doc(id), {
      used_in_post: true,
      used_at: admin.firestore.FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()
}

/**
 * Delete old media (cleanup function)
 */
export async function cleanupOldMedia(businessId: string, daysOld = 90) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysOld)

  const oldMedia = await db
    .collection('media')
    .where('business_id', '==', businessId)
    .where('created_at', '<', cutoff)
    .where('used_in_post', '==', false)
    .get()

  const bucket = storage.bucket()
  const batch = db.batch()

  for (const doc of oldMedia.docs) {
    const data = doc.data()

    // Delete from storage
    try {
      await bucket.file(data.storage_path).delete()
    } catch (e) {
      console.error('Failed to delete file:', data.storage_path)
    }

    // Delete from Firestore
    batch.delete(doc.ref)
  }

  await batch.commit()

  return oldMedia.size
}
