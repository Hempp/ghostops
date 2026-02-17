import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create a browser client for client-side usage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Status type aliases for type safety
export type ConversationStatus = 'active' | 'paused' | 'closed'
export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled'
export type SocialPostStatus = 'draft' | 'pending_approval' | 'scheduled' | 'posted' | 'failed' | 'approved'

// Auth result types - discriminated union for type safety
type AuthResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: Error }

// Auth helper functions
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult<{ user: import('@supabase/supabase-js').User }>> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) {
    return { success: false, error }
  }
  if (!data.user) {
    return { success: false, error: new Error('No user returned from sign in') }
  }
  return { success: true, data: { user: data.user } }
}

export async function signUp(
  email: string,
  password: string
): Promise<AuthResult<{ user: import('@supabase/supabase-js').User | null }>> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) {
    return { success: false, error }
  }
  return { success: true, data: { user: data.user } }
}

export async function signOut(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function resetPasswordForEmail(
  email: string,
  redirectTo?: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${window.location.origin}/reset-password`,
  })
  return { error }
}

export async function updatePassword(
  newPassword: string
): Promise<AuthResult<{ user: import('@supabase/supabase-js').User }>> {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) {
    return { success: false, error }
  }
  if (!data.user) {
    return { success: false, error: new Error('No user returned from password update') }
  }
  return { success: true, data: { user: data.user } }
}

export async function getSession(): Promise<AuthResult<import('@supabase/supabase-js').Session>> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    return { success: false, error }
  }
  if (!data.session) {
    return { success: false, error: new Error('No active session') }
  }
  return { success: true, data: data.session }
}

export async function getCurrentUser(): Promise<AuthResult<import('@supabase/supabase-js').User>> {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    return { success: false, error }
  }
  if (!data.user) {
    return { success: false, error: new Error('No authenticated user') }
  }
  return { success: true, data: data.user }
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
  status: ConversationStatus
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
  status: InvoiceStatus
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
  status: SocialPostStatus
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

/**
 * Send a manual SMS message to a conversation
 *
 * This function:
 * 1. Gets the conversation details (phone number)
 * 2. Calls the SMS send API to deliver the message via Twilio
 * 3. The API handles database logging and daily stats
 *
 * @param conversationId - The conversation to send the message to
 * @param businessId - The business sending the message
 * @param content - The message content
 * @returns The created message record
 */
export async function sendManualMessage(
  conversationId: string,
  businessId: string,
  content: string
): Promise<Message> {
  // First, get the conversation to find the phone number
  const conversation = await getConversation(conversationId)
  if (!conversation) {
    throw new Error('Conversation not found')
  }

  // Get the current session for authentication
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token

  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in to send messages.')
  }

  // Call the SMS send API
  const response = await fetch('/api/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: conversation.phone,
      message: content,
      businessId,
      conversationId,
    }),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to send message')
  }

  // Fetch the newly created message from the database
  // The API has already created it, so we fetch the latest outbound message
  const { data: messages, error: fetchError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (fetchError) {
    // The message was sent successfully, but we couldn't fetch it
    // Return a synthetic message object
    return {
      id: result.messageId || 'temp-id',
      conversation_id: conversationId,
      business_id: businessId,
      direction: 'outbound',
      content,
      media_urls: [],
      message_type: 'text',
      ai_generated: false,
      created_at: new Date().toISOString(),
    }
  }

  return messages as Message
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

export async function updateSocialPostStatus(
  postId: string,
  status: 'draft' | 'pending_approval' | 'scheduled' | 'posted' | 'failed' | 'approved',
  scheduledAt?: string
): Promise<SocialPost> {
  const updateData: Record<string, unknown> = { status }

  if (status === 'scheduled' && scheduledAt) {
    updateData.scheduled_at = scheduledAt
  }

  if (status === 'posted') {
    updateData.posted_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('social_posts')
    .update(updateData)
    .eq('id', postId)
    .select()
    .single()

  if (error) throw error
  return data as SocialPost
}

export async function getPendingActionsCount(businessId: string): Promise<number> {
  const { count, error } = await supabase
    .from('cofounder_actions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'pending')

  if (error) {
    // If table doesn't exist, return fallback
    if (error.code === '42P01') return 0
    throw error
  }
  return count || 0
}

export async function getInsightsCount(businessId: string): Promise<number> {
  // Get count of insights generated today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('cofounder_insights')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', today.toISOString())

  if (error) {
    // If insights table doesn't exist, return fallback
    if (error.code === '42P01') return 0
    throw error
  }
  return count || 0
}

export async function getGoalsProgress(businessId: string): Promise<{ onTrack: number; total: number; percentage: number }> {
  const { data, error } = await supabase
    .from('business_goals')
    .select('id, current_value, target_value')
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (error) {
    // If goals table doesn't exist, return fallback
    if (error.code === '42P01') return { onTrack: 0, total: 0, percentage: 0 }
    throw error
  }

  const goals = data || []
  const total = goals.length

  if (total === 0) return { onTrack: 0, total: 0, percentage: 0 }

  const onTrack = goals.filter(g => {
    const progress = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0
    return progress >= 50
  }).length

  const percentage = Math.round((onTrack / total) * 100)

  return { onTrack, total, percentage }
}
