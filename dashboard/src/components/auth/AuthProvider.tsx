'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const AUTH_TIMEOUT_MS = 10000

interface AuthContextType {
  user: User | null
  session: Session | null
  businessId: string | null
  loading: boolean
  needsOnboarding: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshBusinessData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)

  const fetchBusinessData = useCallback(async (userId: string): Promise<void> => {
    const { data, error: bizError } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('user_id', userId)
      .single()

    if (bizError) {
      console.error('Error fetching business:', bizError)
      setBusinessId(null)
      setNeedsOnboarding(false)
      return
    }

    const bizId = data?.business_id ?? null
    setBusinessId(bizId)

    if (bizId) {
      const { data: business } = await supabase
        .from('businesses')
        .select('onboarding_complete')
        .eq('id', bizId)
        .single()

      setNeedsOnboarding(!business?.onboarding_complete)
    } else {
      setNeedsOnboarding(false)
    }
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    let timeoutId: NodeJS.Timeout | null = null

    async function initializeAuth(): Promise<void> {
      timeoutId = setTimeout(() => {
        setError('Authentication timed out. Please refresh the page.')
        setLoading(false)
      }, AUTH_TIMEOUT_MS)

      const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()

      if (timeoutId) clearTimeout(timeoutId)

      if (sessionError) {
        console.error('Error getting session:', sessionError)
        setError('Failed to check authentication status.')
        setLoading(false)
        return
      }

      setSession(initialSession)
      setUser(initialSession?.user ?? null)

      if (initialSession?.user) {
        await fetchBusinessData(initialSession.user.id)
      }

      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        try {
          setSession(newSession)
          setUser(newSession?.user ?? null)
          setError(null)

          if (newSession?.user) {
            await fetchBusinessData(newSession.user.id)
          } else {
            setBusinessId(null)
            setNeedsOnboarding(false)
          }
        } catch (err) {
          console.error('Error in auth state change:', err)
          setError('Authentication error. Please refresh.')
        } finally {
          setLoading(false)
        }
      }
    )

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [fetchBusinessData])

  async function handleSignOut(): Promise<void> {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error('Error signing out:', signOutError)
    }
    setUser(null)
    setSession(null)
    setBusinessId(null)
    setNeedsOnboarding(false)
    setError(null)
  }

  async function refreshBusinessData(): Promise<void> {
    if (user) {
      await fetchBusinessData(user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        businessId,
        loading,
        needsOnboarding,
        error,
        signOut: handleSignOut,
        refreshBusinessData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
