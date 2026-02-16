'use client'

import { useServiceWorker } from '@/hooks/usePWA'
import { RefreshCw, X } from 'lucide-react'
import { useState } from 'react'

export function UpdateNotification() {
  const { updateAvailable, isUpdating, applyUpdate } = useServiceWorker()
  const [dismissed, setDismissed] = useState(false)

  if (!updateAvailable || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-ghost-card border border-emerald-500/30 rounded-xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <RefreshCw className={`w-5 h-5 text-emerald-500 ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">Update Available</h3>
            <p className="text-xs text-ghost-muted mt-1">
              A new version of GhostOps is ready. Refresh to update.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-1.5 text-xs text-ghost-muted hover:text-white transition-colors rounded border border-ghost-border hover:bg-ghost-border/50"
              >
                Later
              </button>
              <button
                onClick={applyUpdate}
                disabled={isUpdating}
                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Refresh Now'
                )}
              </button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-ghost-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
