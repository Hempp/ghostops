import type { Metadata, Viewport } from 'next'
import './globals.css'

const siteUrl = 'https://landing-psi-wheat.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GhostOps - AI Co-Founder In Your Pocket',
    template: '%s | GhostOps',
  },
  description: 'Run your entire business from text messages. AI-powered SMS automation for invoices, social media, missed call recovery, and more. No app needed.',
  keywords: [
    'AI assistant',
    'SMS automation',
    'business automation',
    'lead response',
    'invoice automation',
    'social media management',
    'missed call text back',
    'AI co-founder',
    'small business AI',
    'contractor software',
  ],
  authors: [{ name: 'GhostOps' }],
  creator: 'GhostOps',
  publisher: 'GhostOps',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'GhostOps',
    title: 'GhostOps - AI Co-Founder In Your Pocket',
    description: 'Run your entire business from text messages. Invoices, social media, missed call recovery — all via SMS. Your AI handles everything while you do the real work.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GhostOps - AI Co-Founder In Your Pocket',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GhostOps - AI Co-Founder In Your Pocket',
    description: 'Run your entire business from text messages. No app needed. AI-powered SMS automation.',
    images: ['/og-image.png'],
    creator: '@ghostops',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: siteUrl,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#07080a' },
    { media: '(prefers-color-scheme: dark)', color: '#07080a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
