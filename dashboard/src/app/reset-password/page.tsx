'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePassword, supabase } from '@/lib/supabase'
import { Ghost, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage(): JSX.Element {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if we have a valid recovery session from the email link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      // The user should have a session from clicking the reset link
      // Supabase automatically handles the recovery token from the URL
      if (session) {
        setIsValidSession(true)
      } else {
        // Listen for auth state changes (recovery link will trigger this)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session) {
              setIsValidSession(true)
            }
          }
        )

        // Set a timeout to show error if no session is detected
        const timeout = setTimeout(() => {
          setIsValidSession(false)
        }, 3000)

        return () => {
          subscription.unsubscribe()
          clearTimeout(timeout)
        }
      }
    }

    checkSession()
  }, [])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error: updateError } = await updatePassword(password)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/')
    }, 2000)
  }

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-ghost-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ghost-accent animate-spin mx-auto mb-4" />
          <p className="text-ghost-muted">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  // Invalid or expired link
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-ghost-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Ghost className="w-10 h-10 text-ghost-accent" />
            <h1 className="text-3xl font-serif text-white">GhostOps</h1>
          </div>

          <div className="bg-ghost-card border border-ghost-border rounded-lg p-6">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">Invalid or Expired Link</h2>
            <p className="text-ghost-muted mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-ghost-accent hover:bg-ghost-accent/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-ghost-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Ghost className="w-10 h-10 text-ghost-accent" />
            <h1 className="text-3xl font-serif text-white">GhostOps</h1>
          </div>

          <div className="bg-ghost-card border border-ghost-border rounded-lg p-6">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">Password Updated</h2>
            <p className="text-ghost-muted">
              Your password has been successfully reset. Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    )
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
          <p className="text-ghost-muted">Enter your new password</p>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="bg-ghost-card border border-ghost-border rounded-lg p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* New Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ghost-muted mb-1">
              New Password
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
                placeholder="Enter new password"
              />
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-ghost-muted mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ghost-muted" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-ghost-bg border border-ghost-border rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-ghost-muted focus:outline-none focus:ring-2 focus:ring-ghost-accent focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ghost-accent hover:bg-ghost-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>

          {/* Back to Login Link */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-ghost-muted hover:text-white transition-colors"
            >
              Back to login
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-ghost-muted text-xs mt-6">
          Your AI Ghost Employee Command Center
        </p>
      </div>
    </div>
  )
}
