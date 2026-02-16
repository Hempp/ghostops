'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-ghost-bg flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Offline Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-ghost-card border border-ghost-border flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-ghost-muted" />
          </div>
        </div>

        {/* GhostOps Logo */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <span className="text-3xl">👻</span>
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              GhostOps
            </span>
          </h1>
        </div>

        {/* Message */}
        <h2 className="text-xl font-semibold text-white mb-2">
          You're Offline
        </h2>
        <p className="text-ghost-muted mb-8">
          It looks like you've lost your internet connection. Some features may be unavailable until you're back online.
        </p>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors w-full"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <p className="text-sm text-ghost-muted">
            Your data will sync automatically when you reconnect.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="mt-8 pt-6 border-t border-ghost-border">
          <div className="flex items-center justify-center gap-2 text-sm text-ghost-muted">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Waiting for connection...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
