// GhostOps Type Definitions - FORGE-X Architecture

// Social Platform Types
export type SocialPlatform = 'instagram' | 'facebook';

export interface PostEngagement {
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  impressions?: number;
}

// Business Settings
export interface BusinessSettings {
  paused: boolean;
  auto_reply_enabled: boolean;
  missed_call_textback: boolean;
  speed_to_lead_enabled: boolean;
  review_requests_enabled: boolean;
  morning_briefing_enabled: boolean;
  morning_briefing_time: string;
  invoice_reminder_days: number[];
}

// Business Integrations
export interface BusinessIntegrations {
  stripe_account_id?: string;
  meta_access_token?: string;
  meta_page_id?: string;
  meta_instagram_id?: string;
  google_refresh_token?: string;
  google_calendar_id?: string;
  google_business_id?: string;
}

// Briefing Metrics (snake_case to match database)
export interface BriefingMetrics {
  new_leads: number;
  new_reviews: number;
  average_rating: number;
  revenue_today: number;
  revenue_week: number;
  unpaid_invoices: number;
  unpaid_amount: number;
  appointments_today: number;
  posts_published?: number;
  total_engagement?: number;
}

export interface Business {
  id: string;
  name: string;
  owner_name: string;
  owner_phone: string;
  industry: string;
  twilio_number: string | null;
  timezone: string;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
  meta_page_id: string | null;
  meta_access_token: string | null;
  instagram_account_id: string | null;
  google_place_id: string | null;
  brand_voice: string;
  business_type: string | null;
  services: string[];
  business_hours: Record<string, string>;
  features_enabled: FeaturesEnabled;
  settings: BusinessSettings;
  integrations: BusinessIntegrations;
  is_active: boolean;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeaturesEnabled {
  missed_call_textback: boolean;
  speed_to_lead: boolean;
  review_engine: boolean;
  sms_invoicing: boolean;
  social_posting: boolean;
  morning_briefing: boolean;
}

export interface Contact {
  id: string;
  business_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
  last_interaction_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  business_id: string;
  contact_id: string | null;
  phone: string;
  status: 'active' | 'resolved' | 'archived';
  context: ConversationContext;
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationContext {
  intent?: string;
  booking_flow?: { step: string; service?: string; date?: string; time?: string };
  invoice_flow?: { step: string; contact_name?: string; amount?: number; description?: string };
  social_flow?: { step: string; media_urls?: string[]; options?: string[]; selected?: number };
  last_topics?: string[];
}

export interface Message {
  id: string;
  conversation_id: string;
  business_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  media_urls: string[];
  message_type: 'sms' | 'mms' | 'system';
  twilio_sid: string | null;
  ai_generated: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  contact_id: string | null;
  contact_phone: string;
  contact_name: string | null;
  service: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  reminder_sent: boolean;
  source: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  contact_id: string | null;
  contact_phone: string;
  contact_name: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  amount: number;
  amount_cents: number;
  description: string;
  line_items: { description: string; amount_cents: number; quantity: number }[];
  stripe_invoice_id: string | null;
  stripe_payment_link: string | null;
  stripe_hosted_url: string | null;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'reminded' | 'pending';
  sent_at: string | null;
  paid_at: string | null;
  reminder_3day_sent: boolean;
  reminder_7day_sent: boolean;
  reminder_count: number;
  created_at: string;
}

export interface Review {
  id: string;
  business_id: string;
  platform: 'google' | 'facebook' | 'yelp';
  external_id: string | null;
  author_name: string | null;
  reviewer_name: string | null;
  rating: number | null;
  content: string | null;
  response: string | null;
  response_ai_generated: boolean;
  responded_at: string | null;
  contact_phone: string | null;
  published_at: string | null;
  created_at: string;
}

export interface SocialPost {
  id: string;
  business_id: string;
  content: string;
  media_urls: string[];
  processed_media_urls: string[];
  platforms: ('instagram' | 'facebook')[];
  status: 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'posted' | 'failed';
  scheduled_at: string | null;
  posted_at: string | null;
  ai_options: string[];
  selected_option: number | null;
  post_ids: Record<string, string>;
  engagement: { likes?: number; comments?: number; shares?: number };
  created_at: string;
}

export interface Lead {
  id: string;
  business_id: string;
  contact_id: string | null;
  phone: string;
  name: string | null;
  email: string | null;
  source: string;
  source_details: Record<string, unknown>;
  received_at: string;
  first_response_at: string | null;
  response_time_seconds: number | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at: string;
}

export interface MissedCall {
  id: string;
  business_id: string;
  caller_phone: string;
  caller_name: string | null;
  twilio_call_sid: string | null;
  textback_sent: boolean;
  textback_sent_at: string | null;
  conversation_id: string | null;
  appointment_booked: boolean;
  appointment_id: string | null;
  called_at: string;
}

export interface DailyStats {
  id: string;
  business_id: string;
  date: string;
  messages_sent: number;
  messages_received: number;
  missed_calls: number;
  new_leads: number;
  invoices_sent: number;
  invoices_paid: number;
  revenue_cents: number;
  posts_published: number;
  reviews_received: number;
  avg_rating: number | null;
}

export interface OwnerConversation {
  id: string;
  business_id: string;
  owner_phone: string;
  context: { last_topic?: string; pending_action?: string };
  created_at: string;
  updated_at: string;
}

export interface OwnerMessage {
  id: string;
  business_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  ai_generated: boolean;
  created_at: string;
}

export interface BusinessIntelligence {
  weeklyStats: DailyStats[];
  unpaidInvoices: Invoice[];
  recentLeads: Lead[];
  todaysAppointments: Appointment[];
  recentReviews: Review[];
  pendingPosts: SocialPost[];
  monthlyRevenue: number;
}

// Webhook Payloads
export interface TwilioSmsWebhook {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  MediaUrl0?: string;
  MediaUrl1?: string;
}

export interface TwilioVoiceWebhook {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  CallerName?: string;
}

// Owner Commands
export type OwnerCommand =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'status' }
  | { type: 'help' }
  | { type: 'unpaid' }
  | { type: 'invoice'; customer: string; contact_name?: string; amount: number; description: string }
  | { type: 'post'; content?: string; platforms?: SocialPlatform[] }
  | { type: 'schedule'; post_id: string; postId?: string; datetime: string }
  | { type: 'stats'; period?: 'today' | 'week' | 'month' }
  | { type: 'unknown'; raw: string };

// AI Context
export interface AIContext {
  business: Business;
  conversation?: Conversation;
  contact?: Contact | null;
  recentMessages?: Message[];
}

export interface AIResponse {
  message: string;
  action?: AIAction;
  confidence: number;
}

export type AIAction =
  | { type: 'book_appointment'; details: Partial<Appointment> }
  | { type: 'create_invoice'; details: Partial<Invoice> }
  | { type: 'request_review' }
  | { type: 'generate_social_post'; options: string[] }
  | { type: 'escalate_to_owner'; reason: string }
  | { type: 'none' };
