// Mock data for local testing without database
import type { Business } from '../types/index.js';

export const MOCK_BUSINESS: Business = {
  id: 'mock-business-123',
  name: 'Test Plumbing Co',
  owner_name: 'John Smith',
  owner_phone: '+15559876543',
  industry: 'plumbing',
  brand_voice: 'friendly and professional',
  timezone: 'America/New_York',
  twilio_number: '+15551234567',
  stripe_account_id: null,
  stripe_onboarded: false,
  meta_page_id: null,
  meta_access_token: null,
  instagram_account_id: null,
  google_place_id: null,
  business_type: 'service',
  services: ['plumbing repair', 'drain cleaning', 'water heater installation'],
  business_hours: {
    monday: '8:00-17:00',
    tuesday: '8:00-17:00',
    wednesday: '8:00-17:00',
    thursday: '8:00-17:00',
    friday: '8:00-17:00',
    saturday: '9:00-14:00',
    sunday: 'closed',
  },
  features_enabled: {
    missed_call_textback: true,
    speed_to_lead: true,
    review_engine: true,
    sms_invoicing: true,
    social_posting: true,
    morning_briefing: true,
  },
  settings: {
    paused: false,
    auto_reply_enabled: true,
    missed_call_textback: true,
    speed_to_lead_enabled: true,
    review_requests_enabled: true,
    morning_briefing_enabled: true,
    morning_briefing_time: '07:00',
    invoice_reminder_days: [3, 7],
  },
  integrations: {
    stripe_account_id: undefined,
    meta_access_token: undefined,
    meta_page_id: undefined,
    meta_instagram_id: undefined,
    google_refresh_token: undefined,
    google_calendar_id: undefined,
    google_business_id: undefined,
  },
  is_active: true,
  is_paused: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// SECURITY: Only enable mock mode in development/test environments
export const MOCK_MODE =
  (process.env.MOCK_MODE === 'true' || process.env.NODE_ENV === 'test') &&
  process.env.NODE_ENV !== 'production';

export function getMockBusiness(phone: string): Business | null {
  // Return mock business for any phone in test mode
  if (MOCK_MODE) {
    return { ...MOCK_BUSINESS, owner_phone: phone };
  }
  return null;
}
