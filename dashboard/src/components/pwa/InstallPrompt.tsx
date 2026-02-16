'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone: boolean }).standalone === true

    setIsStandalone(isInStandaloneMode)

    // Check for iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Check if user has dismissed the prompt before
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        // Show after a short delay to not interrupt initial experience
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
      localStorage.setItem('pwa-installed', 'true')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already installed or prompt not available
  if (isStandalone || (!deferredPrompt && !isIOS)) return null

  // Show iOS-specific instructions
  if (isIOS && !isStandalone) {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem('pwa-ios-dismissed')
    if (dismissed) return null

    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
        <div className="bg-ghost-card border border-ghost-border rounded-xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">Install GhostOps</h3>
              <p className="text-xs text-ghost-muted mt-1">
                Tap <span className="inline-flex items-center px-1 bg-ghost-border rounded">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L11 6.414V15a1 1 0 11-2 0V6.414L6.707 8.707a1 1 0 01-1.414-1.414l4-4A1 1 0 0110 3z" />
                  </svg>
                </span> then "Add to Home Screen"
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('pwa-ios-dismissed', 'true')
                setShowPrompt(false)
              }}
              className="flex-shrink-0 text-ghost-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Standard install prompt for Chrome, Edge, etc.
  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-ghost-card border border-ghost-border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-ghost-border bg-gradient-to-r from-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl">
              👻
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Install GhostOps</h3>
              <p className="text-xs text-ghost-muted">Get the full app experience</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-ghost-muted">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-500 text-[10px]">✓</span>
            </div>
            <span>Works offline</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ghost-muted">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-500 text-[10px]">✓</span>
            </div>
            <span>Faster load times</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ghost-muted">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-500 text-[10px]">✓</span>
            </div>
            <span>Launch from home screen</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 text-sm text-ghost-muted hover:text-white transition-colors rounded-lg border border-ghost-border hover:bg-ghost-border/50"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Install
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to check PWA installation status
 */
export function usePWAInstallStatus() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Check if running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone: boolean }).standalone === true

    setIsInstalled(isStandalone)

    // Listen for installability
    const handleBeforeInstall = () => setIsInstallable(true)
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  return { isInstalled, isInstallable }
}
