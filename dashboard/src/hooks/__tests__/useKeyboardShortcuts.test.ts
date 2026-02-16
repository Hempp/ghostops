import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts, shortcuts } from '../useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  let onViewChange: ReturnType<typeof vi.fn>
  let onSearch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onViewChange = vi.fn()
    onSearch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const fireKeyboardEvent = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...options,
    })
    window.dispatchEvent(event)
    return event
  }

  describe('single key navigation', () => {
    it('should navigate to dashboard on "d" key press', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('d')
      })

      expect(onViewChange).toHaveBeenCalledWith('dashboard')
    })

    it('should navigate to conversations on "m" key press', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('m')
      })

      expect(onViewChange).toHaveBeenCalledWith('conversations')
    })

    it('should navigate to invoices on "i" key press', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('i')
      })

      expect(onViewChange).toHaveBeenCalledWith('invoices')
    })

    it('should navigate to calendar on "c" key press', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('c')
      })

      expect(onViewChange).toHaveBeenCalledWith('calendar')
    })

    it('should navigate to settings on "s" key press', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('s')
      })

      expect(onViewChange).toHaveBeenCalledWith('settings')
    })

    it('should trigger search on "/" key press', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('/')
      })

      expect(onSearch).toHaveBeenCalled()
    })
  })

  describe('modifier key navigation (Cmd/Ctrl)', () => {
    it('should navigate to dashboard on Cmd+1', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('1', { metaKey: true })
      })

      expect(onViewChange).toHaveBeenCalledWith('dashboard')
    })

    it('should navigate to conversations on Ctrl+2', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('2', { ctrlKey: true })
      })

      expect(onViewChange).toHaveBeenCalledWith('conversations')
    })

    it('should navigate to invoices on Cmd+3', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('3', { metaKey: true })
      })

      expect(onViewChange).toHaveBeenCalledWith('invoices')
    })

    it('should navigate to calendar on Cmd+4', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('4', { metaKey: true })
      })

      expect(onViewChange).toHaveBeenCalledWith('calendar')
    })

    it('should navigate to settings on Cmd+5', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('5', { metaKey: true })
      })

      expect(onViewChange).toHaveBeenCalledWith('settings')
    })

    it('should trigger search on Cmd+K', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      act(() => {
        fireKeyboardEvent('k', { metaKey: true })
      })

      expect(onSearch).toHaveBeenCalled()
    })
  })

  describe('enabled prop', () => {
    it('should not respond to shortcuts when disabled', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch, enabled: false }))

      act(() => {
        fireKeyboardEvent('d')
      })

      expect(onViewChange).not.toHaveBeenCalled()

      act(() => {
        fireKeyboardEvent('k', { metaKey: true })
      })

      expect(onSearch).not.toHaveBeenCalled()
    })

    it('should respond to shortcuts when enabled', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch, enabled: true }))

      act(() => {
        fireKeyboardEvent('d')
      })

      expect(onViewChange).toHaveBeenCalledWith('dashboard')
    })
  })

  describe('input field handling', () => {
    it('should not trigger shortcuts when typing in input fields', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      // Create an input element and make it the target
      const input = document.createElement('input')
      document.body.appendChild(input)

      const event = new KeyboardEvent('keydown', {
        key: 'd',
        bubbles: true,
      })
      Object.defineProperty(event, 'target', { value: input })

      act(() => {
        window.dispatchEvent(event)
      })

      expect(onViewChange).not.toHaveBeenCalled()

      document.body.removeChild(input)
    })

    it('should not trigger shortcuts when typing in textarea', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)

      const event = new KeyboardEvent('keydown', {
        key: 's',
        bubbles: true,
      })
      Object.defineProperty(event, 'target', { value: textarea })

      act(() => {
        window.dispatchEvent(event)
      })

      expect(onViewChange).not.toHaveBeenCalled()

      document.body.removeChild(textarea)
    })

    it('should not trigger shortcuts in contenteditable elements', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange, onSearch }))

      const div = document.createElement('div')
      div.setAttribute('contenteditable', 'true')
      // Need to explicitly set isContentEditable property for jsdom
      Object.defineProperty(div, 'isContentEditable', { value: true })
      document.body.appendChild(div)

      const event = new KeyboardEvent('keydown', {
        key: 'm',
        bubbles: true,
      })
      Object.defineProperty(event, 'target', { value: div })

      act(() => {
        window.dispatchEvent(event)
      })

      expect(onViewChange).not.toHaveBeenCalled()

      document.body.removeChild(div)
    })
  })

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({ onViewChange, onSearch })
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('optional callbacks', () => {
    it('should work without onSearch callback', () => {
      renderHook(() => useKeyboardShortcuts({ onViewChange }))

      act(() => {
        fireKeyboardEvent('/')
      })

      // Should not throw error
      expect(onViewChange).not.toHaveBeenCalled()
    })
  })
})

describe('shortcuts constant', () => {
  it('should export correct shortcut definitions', () => {
    expect(shortcuts).toHaveLength(7)

    expect(shortcuts).toContainEqual({
      key: 'D',
      label: 'Dashboard',
      view: 'dashboard',
    })

    expect(shortcuts).toContainEqual({
      key: 'M',
      label: 'Messages',
      view: 'conversations',
    })

    expect(shortcuts).toContainEqual({
      key: '/',
      label: 'Search',
      view: null,
    })
  })

  it('should have correct views for all shortcuts', () => {
    const viewShortcuts = shortcuts.filter((s) => s.view !== null)
    const expectedViews = ['dashboard', 'conversations', 'invoices', 'calendar', 'settings']

    expectedViews.forEach((view) => {
      expect(viewShortcuts.some((s) => s.view === view)).toBe(true)
    })
  })
})
