import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GhostOps - Your AI Employee That Never Sleeps',
  description: 'SMS-powered AI assistant that handles leads, books appointments, sends invoices, and manages your social media. All via text message.',
  keywords: 'AI assistant, SMS automation, business automation, lead response, invoice, social media',
  openGraph: {
    title: 'GhostOps - Your AI Employee That Never Sleeps',
    description: 'Run your entire business from text messages. AI-powered SMS automation.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
