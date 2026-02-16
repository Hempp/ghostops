'use client'

import { InstallPrompt } from './InstallPrompt'
import { OfflineIndicator } from './OfflineIndicator'
import { UpdateNotification } from './UpdateNotification'

interface PWAProviderProps {
  children: React.ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  return (
    <>
      {children}
      <OfflineIndicator />
      <InstallPrompt />
      <UpdateNotification />
    </>
  )
}
