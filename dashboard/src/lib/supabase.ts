import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create a browser client for client-side usage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Auth helper functions
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

// Get the business ID for the current user
export async function getUserBusinessId(): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('business_users')
    .select('business_id')
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching user business:', error)
    return null
  }

  return data?.business_id || null
}

// Business user type
export interface BusinessUser {
  id: string
  user_id: string
  business_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

// Types matching the database schema
export interface Conversation {
  id: string
  business_id: string
  contact_id: string | null
  phone: string
  status: string
  context: Record<string, unknown>
  last_message_at: string
  created_at: string
  contacts?: Contact
}

export interface Contact {
  id: string
  name: string | null
  phone: string
  email: string | null
  source: string | null
}

export interface Message {
  id: string
  conversation_id: string
  business_id: string
  direction: 'inbound' | 'outbound'
  content: string
  media_urls: string[]
  message_type: string
  ai_generated: boolean
  created_at: string
}

export interface Invoice {
  id: string
  business_id: string
  contact_phone: string
  contact_name: string | null
  amount_cents: number
  description: string
  status: string
  sent_at: string | null
  paid_at: string | null
  created_at: string
}

export interface DailyStats {
  id: string
  business_id: string
  date: string
  messages_sent: number
  messages_received: number
  missed_calls: number
  new_leads: number
  invoices_sent: number
  invoices_paid: number
  revenue_cents: number
  posts_published: number
  reviews_received: number
}

export interface SocialPost {
  id: string
  business_id: string
  content: string
  media_urls: string[]
  platforms: string[]
  status: string
  scheduled_at: string | null
  posted_at: string | null
  engagement: { likes?: number; comments?: number; shares?: number }
  created_at: string
}

// Fetch functions
export async function getConversations(businessId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, contacts(*)')
    .eq('business_id', businessId)
    .order('last_message_at', { ascending: false })
  
  if (error) throw error
  return data as Conversation[]
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data as Message[]
}

export async function getInvoices(businessId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Invoice[]
}

export async function getStats(businessId: string, days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('business_id', businessId)
    .gte('date', since)
    .order('date', { ascending: false })
  
  if (error) throw error
  return data as DailyStats[]
}

export async function getSocialPosts(businessId: string) {
  const { data, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as SocialPost[]
}

// Mutation functions
export async function sendManualMessage(
  conversationId: string,
  businessId: string,
  content: string
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      business_id: businessId,
      direction: 'outbound',
      content,
      message_type: 'text',
      ai_generated: false,
      media_urls: []
    })
    .select()
    .single()

  if (error) throw error
  return data as Message
}

export async function updateConversationStatus(
  conversationId: string,
  status: 'active' | 'paused' | 'closed'
) {
  const { error } = await supabase
    .from('conversations')
    .update({ status })
    .eq('id', conversationId)

  if (error) throw error
}

export async function getConversation(conversationId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, contacts(*)')
    .eq('id', conversationId)
    .single()

  if (error) throw error
  return data as Conversation
}

// Real-time subscriptions
export function subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
  return supabase
    .channel('messages:' + conversationId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: 'conversation_id=eq.' + conversationId
    }, (payload) => {
      callback(payload.new as Message)
    })
    .subscribe()
}

export function subscribeToConversations(businessId: string, callback: (conversation: Conversation) => void) {
  return supabase
    .channel('conversations:' + businessId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'conversations',
      filter: 'business_id=eq.' + businessId
    }, (payload) => {
      callback(payload.new as Conversation)
    })
    .subscribe()
}

export function subscribeToInvoices(businessId: string, callback: (invoice: Invoice) => void) {
  return supabase
    .channel('invoices:' + businessId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'invoices',
      filter: 'business_id=eq.' + businessId
    }, (payload) => {
      callback(payload.new as Invoice)
    })
    .subscribe()
}

export function subscribeToSocialPosts(businessId: string, callback: (post: SocialPost) => void) {
  return supabase
    .channel('social_posts:' + businessId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'social_posts',
      filter: 'business_id=eq.' + businessId
    }, (payload) => {
      callback(payload.new as SocialPost)
    })
    .subscribe()
}

export function subscribeToStats(businessId: string, callback: (stats: DailyStats) => void) {
  return supabase
    .channel('daily_stats:' + businessId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'daily_stats',
      filter: 'business_id=eq.' + businessId
    }, (payload) => {
      callback(payload.new as DailyStats)
    })
    .subscribe()
}

// Business Settings Types
export interface BusinessSettings {
  // AI behavior settings (stored in features_enabled)
  aiEnabled: boolean
  autoReply: boolean
  workingHoursOnly: boolean
  // Notification settings (stored in settings JSONB)
  notifyOnNewLead: boolean
  notifyOnPayment: boolean
  notifyOnMissedCall: boolean
  // Appearance settings (stored in settings JSONB)
  darkMode: boolean
  soundEnabled: boolean
}

export interface Business {
  id: string
  name: string | null
  owner_email: string | null
  owner_name: string | null
  owner_phone: string | null
  is_paused: boolean
  features_enabled: {
    missed_call_textback?: boolean
    speed_to_lead?: boolean
    review_engine?: boolean
    sms_invoicing?: boolean
    social_posting?: boolean
    morning_briefing?: boolean
    ai_enabled?: boolean
    auto_reply?: boolean
    working_hours_only?: boolean
  }
  settings: {
    notify_on_new_lead?: boolean
    notify_on_payment?: boolean
    notify_on_missed_call?: boolean
    dark_mode?: boolean
    sound_enabled?: boolean
  } | null
  created_at: string
  updated_at: string
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as Business
}

export async function getBusinessSettings(businessId: string): Promise<BusinessSettings> {
  const business = await getBusiness(businessId)

  if (!business) {
    // Return defaults if business not found
    return {
      aiEnabled: true,
      autoReply: true,
      workingHoursOnly: false,
      notifyOnNewLead: true,
      notifyOnPayment: true,
      notifyOnMissedCall: true,
      darkMode: true,
      soundEnabled: false,
    }
  }

  const features = business.features_enabled || {}
  const settings = business.settings || {}

  return {
    // AI behavior from features_enabled
    aiEnabled: features.ai_enabled ?? true,
    autoReply: features.auto_reply ?? features.speed_to_lead ?? true,
    workingHoursOnly: features.working_hours_only ?? false,
    // Notifications from settings
    notifyOnNewLead: settings.notify_on_new_lead ?? true,
    notifyOnPayment: settings.notify_on_payment ?? true,
    notifyOnMissedCall: settings.notify_on_missed_call ?? true,
    // Appearance from settings
    darkMode: settings.dark_mode ?? true,
    soundEnabled: settings.sound_enabled ?? false,
  }
}

export async function updateBusinessSettings(
  businessId: string,
  updates: Partial<BusinessSettings>
): Promise<void> {
  // First get current business data
  const business = await getBusiness(businessId)
  if (!business) {
    throw new Error('Business not found')
  }

  const currentFeatures = business.features_enabled || {}
  const currentSettings = business.settings || {}

  // Build updated features_enabled object
  const newFeatures = { ...currentFeatures }
  if (updates.aiEnabled !== undefined) newFeatures.ai_enabled = updates.aiEnabled
  if (updates.autoReply !== undefined) newFeatures.auto_reply = updates.autoReply
  if (updates.workingHoursOnly !== undefined) newFeatures.working_hours_only = updates.workingHoursOnly

  // Build updated settings object
  const newSettings = { ...currentSettings }
  if (updates.notifyOnNewLead !== undefined) newSettings.notify_on_new_lead = updates.notifyOnNewLead
  if (updates.notifyOnPayment !== undefined) newSettings.notify_on_payment = updates.notifyOnPayment
  if (updates.notifyOnMissedCall !== undefined) newSettings.notify_on_missed_call = updates.notifyOnMissedCall
  if (updates.darkMode !== undefined) newSettings.dark_mode = updates.darkMode
  if (updates.soundEnabled !== undefined) newSettings.sound_enabled = updates.soundEnabled

  const { error } = await supabase
    .from('businesses')
    .update({
      features_enabled: newFeatures,
      settings: newSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId)

  if (error) throw error
}

export async function updateBusinessPausedStatus(
  businessId: string,
  isPaused: boolean
): Promise<void> {
  const { error } = await supabase
    .from('businesses')
    .update({
      is_paused: isPaused,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId)

  if (error) throw error
}
