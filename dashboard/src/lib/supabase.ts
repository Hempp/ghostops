import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
