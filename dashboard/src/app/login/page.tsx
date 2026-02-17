'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmail, signUp, resetPasswordForEmail } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { Ghost, Mail, Lock, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

export default function LoginPage(): JSX.Element | null {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/')
    }
  }, [authLoading, user, router])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (isForgotPassword) {
      const { error: resetError } = await resetPasswordForEmail(email)
      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }
      setMessage('Check your email for a password reset link.')
      setLoading(false)
      return
    }

    if (isSignUp) {
      const { error: signUpError } = await signUp(email, password)
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      setMessage('Check your email for a confirmation link.')
      setLoading(false)
      return
    }

    const { error: signInError } = await signInWithEmail(email, password)
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }
    // Don't redirect here - let useEffect handle it after auth state updates
    // This prevents race conditions between login and auth state propagation
    setLoading(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-ghost-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-ghost-accent animate-spin" />
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-ghost-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Ghost className="w-10 h-10 text-ghost-accent" />
            <h1 className="text-3xl font-serif text-white">GhostOps</h1>
          </div>
          <p className="text-ghost-muted">
            {isForgotPassword
              ? 'Reset your password'
              : isSignUp
              ? 'Create your account'
              : 'Sign in to your dashboard'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-ghost-card border border-ghost-border rounded-lg p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg p-3">
              <p className="text-sm">{message}</p>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ghost-muted mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ghost-muted" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-ghost-bg border border-ghost-border rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-ghost-muted focus:outline-none focus:ring-2 focus:ring-ghost-accent focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password Field */}
          {!isForgotPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ghost-muted mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ghost-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-ghost-bg border border-ghost-border rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-ghost-muted focus:outline-none focus:ring-2 focus:ring-ghost-accent focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ghost-accent hover:bg-ghost-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isForgotPassword
                  ? 'Sending reset link...'
                  : isSignUp
                  ? 'Creating account...'
                  : 'Signing in...'}
              </>
            ) : isForgotPassword ? (
              'Send reset link'
            ) : isSignUp ? (
              'Create account'
            ) : (
              'Sign in'
            )}
          </button>

          {/* Forgot Password Link */}
          {!isForgotPassword && !isSignUp && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true)
                  setError(null)
                  setMessage(null)
                }}
                className="text-sm text-ghost-muted hover:text-white transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Back to Sign In from Forgot Password */}
          {isForgotPassword && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false)
                  setError(null)
                  setMessage(null)
                }}
                className="text-sm text-ghost-muted hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>
            </div>
          )}

          {/* Toggle Sign Up / Sign In */}
          {!isForgotPassword && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setMessage(null)
                }}
                className="text-sm text-ghost-muted hover:text-white transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <p className="text-center text-ghost-muted text-xs mt-6">
          Your AI Ghost Employee Command Center
        </p>
      </div>
    </div>
  )
}
