'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getUserBusinessId } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  businessId: string | null
  loading: boolean
  needsOnboarding: boolean
  signOut: () => Promise<void>
  refreshBusinessData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  businessId: null,
  loading: true,
  needsOnboarding: false,
  signOut: async () => {},
  refreshBusinessData: async () => {},
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkOnboardingStatus = async (bizId: string) => {
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('onboarding_complete')
        .eq('id', bizId)
        .single()

      return !business?.onboarding_complete
    } catch {
      return false
    }
  }

  const fetchBusinessData = async () => {
    const bizId = await getUserBusinessId()
    setBusinessId(bizId)

    if (bizId) {
      const needsSetup = await checkOnboardingStatus(bizId)
      setNeedsOnboarding(needsSetup)
    }
  }

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        if (initialSession?.user) {
          await fetchBusinessData()
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          await fetchBusinessData()
        } else {
          setBusinessId(null)
          setNeedsOnboarding(false)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setBusinessId(null)
      setNeedsOnboarding(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const refreshBusinessData = async () => {
    if (user) {
      await fetchBusinessData()
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
        signOut: handleSignOut,
        refreshBusinessData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
