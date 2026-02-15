'use client'

import { X, Keyboard } from 'lucide-react'

interface KeyboardShortcutsHelpProps {
  onClose: () => void
}

export default function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  const shortcuts = [
    { category: 'Navigation', items: [
      { keys: ['D'], description: 'Go to Dashboard' },
      { keys: ['M'], description: 'Go to Messages' },
      { keys: ['I'], description: 'Go to Invoices' },
      { keys: ['C'], description: 'Go to Calendar' },
      { keys: ['S'], description: 'Go to Settings' },
    ]},
    { category: 'Search', items: [
      { keys: ['/'], description: 'Focus search' },
      { keys: ['⌘', 'K'], description: 'Quick search' },
    ]},
    { category: 'General', items: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close dialogs / Clear focus' },
    ]},
  ]

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-ghost-card border border-ghost-border rounded-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ghost-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600/20 rounded-lg flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ghost-muted hover:text-white transition-colors rounded-lg hover:bg-ghost-border"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-medium text-ghost-muted mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-white">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <span key={j}>
                          <kbd className="px-2 py-1 bg-ghost-bg border border-ghost-border rounded text-xs text-ghost-muted font-mono">
                            {key}
                          </kbd>
                          {j < shortcut.keys.length - 1 && (
                            <span className="text-ghost-muted mx-1">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ghost-border bg-ghost-bg/50">
          <p className="text-xs text-ghost-muted text-center">
            Press <kbd className="px-1.5 py-0.5 bg-ghost-border rounded text-xs font-mono">?</kbd> to toggle this help
          </p>
        </div>
      </div>
    </div>
  )
}
