'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Ghost, CheckCircle, MessageSquare, Smartphone } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (sessionId) {
      // Session exists, payment was successful
      setStatus('success')
    } else {
      setStatus('error')
    }
  }, [sessionId])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-ghost-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-ghost-bg flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-serif text-white mb-4">Something went wrong</h1>
          <p className="text-ghost-muted mb-8">We couldn&apos;t verify your payment. Please contact support.</p>
          <a href="/" className="text-emerald-400 hover:text-emerald-300">
            Return to homepage
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ghost-bg flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>

        {/* Header */}
        <h1 className="text-4xl font-serif text-white mb-4">
          Welcome to GhostOps!
        </h1>
        <p className="text-xl text-ghost-muted mb-12">
          Your AI business assistant is being set up right now.
        </p>

        {/* Next Steps */}
        <div className="bg-ghost-card border border-ghost-border rounded-2xl p-8 text-left mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">What happens next:</h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-white font-medium">Check your phone</div>
                <div className="text-ghost-muted text-sm">
                  You&apos;ll receive an SMS in the next 60 seconds with your new AI number.
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-white font-medium">Save the number</div>
                <div className="text-ghost-muted text-sm">
                  Save it as &quot;GhostOps AI&quot; in your contacts. Text it anytime to manage your business.
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Ghost className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-white font-medium">Start texting commands</div>
                <div className="text-ghost-muted text-sm">
                  Try &quot;what&apos;s my day&quot; or &quot;help&quot; to see what your AI can do.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Commands */}
        <div className="bg-ghost-card/50 border border-ghost-border rounded-xl p-6 mb-8">
          <div className="text-sm text-ghost-muted mb-3">Try these commands:</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              "what's my day",
              "invoice John 500",
              "schedule meeting tomorrow 2pm",
              "post to instagram",
              "email my accountant",
            ].map((cmd) => (
              <span
                key={cmd}
                className="px-3 py-1.5 bg-ghost-bg rounded-full text-sm text-white border border-ghost-border"
              >
                {cmd}
              </span>
            ))}
          </div>
        </div>

        <p className="text-ghost-muted text-sm">
          Questions? Text your AI number &quot;help&quot; or email support@ghostops.ai
        </p>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ghost-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
