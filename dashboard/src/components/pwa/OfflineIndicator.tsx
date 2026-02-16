'use client'

import { useOnlineStatus } from '@/hooks/usePWA'
import { WifiOff, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const [showReconnected, setShowReconnected] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
    } else if (wasOffline) {
      // Show reconnected message briefly
      setShowReconnected(true)
      const timer = setTimeout(() => {
        setShowReconnected(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  // Show offline banner
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium shadow-lg animate-in slide-in-from-top duration-300">
        <WifiOff className="w-4 h-4" />
        <span>You're offline. Some features may be unavailable.</span>
      </div>
    )
  }

  // Show reconnected message briefly
  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium shadow-lg animate-in slide-in-from-top duration-300">
        <Wifi className="w-4 h-4" />
        <span>You're back online!</span>
      </div>
    )
  }

  return null
}
