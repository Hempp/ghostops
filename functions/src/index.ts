import * as admin from 'firebase-admin'

// Initialize Firebase Admin
admin.initializeApp()

// Export Firestore and Storage for use in other modules
export const db = admin.firestore()
export const storage = admin.storage()

// ============================================
// TWILIO WEBHOOKS
// ============================================
export { twilioSms, twilioVoice } from './handlers/twilio'

// ============================================
// GOOGLE OAUTH
// ============================================
export { googleAuthStart, googleAuthCallback } from './handlers/oauth'

// ============================================
// STRIPE WEBHOOKS
// ============================================
export { stripeWebhook } from './handlers/stripe'

// ============================================
// SCHEDULED FUNCTIONS
// ============================================
export { morningBriefing, invoiceReminders, scheduledPosts } from './handlers/scheduled'

// ============================================
// ADMIN API (for dashboard)
// ============================================
export { api } from './handlers/api'
