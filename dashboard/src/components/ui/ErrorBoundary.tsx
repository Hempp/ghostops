'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** Optional name of the section for better error messages */
  section?: string
  /** Callback when error occurs - useful for logging/analytics */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Whether to show a compact error UI (useful for smaller sections) */
  compact?: boolean
  /** Whether this is the root/app-level boundary */
  isRoot?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Store error info for display
    this.setState({ errorInfo })

    // Log detailed error information for debugging
    const section = this.props.section || 'Unknown Section'
    console.group(`ErrorBoundary [${section}]`)
    console.error('Error:', error)
    console.error('Error Message:', error.message)
    console.error('Error Stack:', error.stack)
    console.error('Component Stack:', errorInfo.componentStack)
    console.groupEnd()

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const section = this.props.section || 'this section'
      const isRoot = this.props.isRoot
      const compact = this.props.compact

      // Compact error UI for smaller sections
      if (compact) {
        return (
          <div className="flex items-center justify-center p-4 bg-ghost-card/50 rounded-lg border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ghost-muted truncate">
                  Failed to load {section}
                </p>
              </div>
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-ghost-card text-white rounded-md hover:bg-ghost-border transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          </div>
        )
      }

      // Full error UI
      return (
        <div className={`flex items-center justify-center p-6 ${isRoot ? 'min-h-screen bg-ghost-bg' : 'min-h-[200px]'}`}>
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {isRoot ? 'Application Error' : `Error in ${section}`}
            </h3>
            <p className="text-ghost-muted text-sm mb-2">
              {isRoot
                ? 'The application encountered an unexpected error.'
                : `Something went wrong while loading ${section}.`}
            </p>
            {this.state.error?.message && (
              <p className="text-red-400/80 text-xs font-mono mb-4 p-2 bg-red-500/10 rounded border border-red-500/20">
                {this.state.error.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              {isRoot && (
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ghost-card text-white rounded-lg hover:bg-ghost-border transition-colors border border-ghost-border"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              )}
            </div>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6 text-left">
                <summary className="text-ghost-muted text-xs cursor-pointer hover:text-white">
                  Show Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-3 bg-ghost-card rounded text-xs text-red-400 overflow-auto max-h-48 border border-ghost-border">
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Section-specific error boundary wrapper for cleaner usage
 */
interface SectionErrorBoundaryProps {
  children: ReactNode
  section: string
  compact?: boolean
}

export function SectionErrorBoundary({ children, section, compact = false }: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary section={section} compact={compact}>
      {children}
    </ErrorBoundary>
  )
}

/**
 * App-level error boundary for catching top-level errors
 */
interface AppErrorBoundaryProps {
  children: ReactNode
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary section="Application" isRoot>
      {children}
    </ErrorBoundary>
  )
}

// Hook for functional components to trigger error boundary
export function useErrorHandler() {
  return (error: Error) => {
    throw error
  }
}
