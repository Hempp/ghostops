import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions in development, reduce in production

  // Session Replay - capture user sessions for debugging
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Set environment
  environment: process.env.NODE_ENV,

  // Ignore common non-actionable errors
  ignoreErrors: [
    // Network errors
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // User-initiated navigation
    'AbortError',
    'The operation was aborted',
    // Browser extensions
    'ResizeObserver loop',
    // Authentication redirects
    'NEXT_REDIRECT',
  ],

  // Before sending error, clean up sensitive data
  beforeSend(event) {
    // Remove sensitive data from URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]+/g, 'token=REDACTED')
    }
    return event
  },

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media for privacy
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
})
