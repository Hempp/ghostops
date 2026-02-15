import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'GhostOps Dashboard',
  description: 'Your AI Ghost Employee Command Center',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-ghost-bg min-h-screen">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#141414',
              border: '1px solid #262626',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  )
}
