'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Hook to manage service worker updates
 */
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Get current registration
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg)
      })

      // Listen for updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Service worker has been updated
        window.location.reload()
      })
    }
  }, [])

  useEffect(() => {
    if (!registration) return

    // Check for updates periodically
    const checkForUpdates = () => {
      registration.update().catch(console.error)
    }

    // Check every 60 seconds
    const interval = setInterval(checkForUpdates, 60000)

    // Listen for waiting service worker (update available)
    const handleStateChange = () => {
      if (registration.waiting) {
        setUpdateAvailable(true)
      }
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', handleStateChange)
      }
    })

    return () => {
      clearInterval(interval)
    }
  }, [registration])

  const applyUpdate = useCallback(() => {
    if (!registration?.waiting) return

    setIsUpdating(true)

    // Tell the waiting service worker to activate
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }, [registration])

  return {
    registration,
    updateAvailable,
    isUpdating,
    applyUpdate,
  }
}

/**
 * Hook to track PWA display mode
 */
export function useDisplayMode() {
  const [displayMode, setDisplayMode] = useState<'browser' | 'standalone' | 'minimal-ui' | 'fullscreen'>('browser')

  useEffect(() => {
    const mediaQueries = {
      standalone: window.matchMedia('(display-mode: standalone)'),
      minimalUi: window.matchMedia('(display-mode: minimal-ui)'),
      fullscreen: window.matchMedia('(display-mode: fullscreen)'),
    }

    const updateDisplayMode = () => {
      if (mediaQueries.standalone.matches) {
        setDisplayMode('standalone')
      } else if (mediaQueries.minimalUi.matches) {
        setDisplayMode('minimal-ui')
      } else if (mediaQueries.fullscreen.matches) {
        setDisplayMode('fullscreen')
      } else {
        setDisplayMode('browser')
      }
    }

    updateDisplayMode()

    // Listen for changes
    Object.values(mediaQueries).forEach((mq) => {
      mq.addEventListener('change', updateDisplayMode)
    })

    return () => {
      Object.values(mediaQueries).forEach((mq) => {
        mq.removeEventListener('change', updateDisplayMode)
      })
    }
  }, [])

  return displayMode
}

/**
 * Hook to handle app visibility and background sync
 */
export function useAppVisibility() {
  const [isVisible, setIsVisible] = useState(true)
  const [lastVisibleAt, setLastVisibleAt] = useState<Date | null>(null)

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible'
      setIsVisible(visible)

      if (visible) {
        setLastVisibleAt(new Date())
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return { isVisible, lastVisibleAt }
}
