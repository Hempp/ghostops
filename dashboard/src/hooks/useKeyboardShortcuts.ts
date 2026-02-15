'use client'

import { useEffect, useCallback } from 'react'

type View = 'dashboard' | 'conversations' | 'invoices' | 'calendar' | 'settings'

interface UseKeyboardShortcutsOptions {
  onViewChange: (view: View) => void
  onSearch?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onViewChange,
  onSearch,
  enabled = true
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Only allow Escape to work in input fields
      if (event.key !== 'Escape') return
    }

    // Check for Cmd/Ctrl modifier
    const isMod = event.metaKey || event.ctrlKey

    // Global shortcuts (with modifier)
    if (isMod) {
      switch (event.key.toLowerCase()) {
        case 'k':
          // Cmd+K - Focus search
          event.preventDefault()
          onSearch?.()
          return
        case '1':
          event.preventDefault()
          onViewChange('dashboard')
          return
        case '2':
          event.preventDefault()
          onViewChange('conversations')
          return
        case '3':
          event.preventDefault()
          onViewChange('invoices')
          return
        case '4':
          event.preventDefault()
          onViewChange('calendar')
          return
        case '5':
          event.preventDefault()
          onViewChange('settings')
          return
      }
    }

    // Quick navigation without modifier (when not in input)
    if (!isMod && !event.shiftKey && !event.altKey) {
      switch (event.key.toLowerCase()) {
        case 'g':
          // g then d/m/i/c/s for Go to...
          // For simplicity, single key navigation
          break
        case 'd':
          onViewChange('dashboard')
          return
        case 'm':
          onViewChange('conversations')
          return
        case 'i':
          onViewChange('invoices')
          return
        case 'c':
          onViewChange('calendar')
          return
        case 's':
          onViewChange('settings')
          return
        case '/':
          event.preventDefault()
          onSearch?.()
          return
      }
    }
  }, [onViewChange, onSearch])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

// Shortcut hints for UI display
export const shortcuts = [
  { key: 'D', label: 'Dashboard', view: 'dashboard' as View },
  { key: 'M', label: 'Messages', view: 'conversations' as View },
  { key: 'I', label: 'Invoices', view: 'invoices' as View },
  { key: 'C', label: 'Calendar', view: 'calendar' as View },
  { key: 'S', label: 'Settings', view: 'settings' as View },
  { key: '/', label: 'Search', view: null },
  { key: '⌘K', label: 'Quick Search', view: null },
]
