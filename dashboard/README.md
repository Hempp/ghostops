# GhostOps Dashboard

The business command center for GhostOps — a Next.js 14 PWA with real-time updates, AI co-founder chat, and premium UI design.

## Live Demo

https://dashboard-kappa-inky-19.vercel.app

**Demo Login**: `demo@ghostops.test` / `DemoPass123`

## Features

- **Command Center** — Real-time stats with animated charts
- **AI Co-Founder** — Strategic chat with memory and context
- **Conversations** — Manage SMS threads with customers
- **Invoices** — Track payments, mobile-optimized card view
- **Content Calendar** — Schedule social media posts
- **Settings** — Configure AI behavior and preferences

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom Design System
- **State**: React Context + Supabase Realtime
- **Auth**: Supabase Auth
- **PWA**: next-pwa with offline support
- **Monitoring**: Sentry + Vercel Analytics

## Design System

Custom CSS variables in `globals.css`:

```css
:root {
  --ghost-bg: #07080a;
  --ghost-card: #111318;
  --ghost-border: #1e2028;
  --ghost-muted: #5c5f6a;
  --ghost-text: #e4e4e7;
  --accent-primary: #10b981;
}
```

**Fonts**:
- Display: Playfair Display (serif)
- Body: Plus Jakarta Sans
- Mono: JetBrains Mono

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your Supabase and API keys

# Start development server
npm run dev
```

Open http://localhost:3000

## Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Optional (monitoring)
NEXT_PUBLIC_SENTRY_DSN=xxx
SENTRY_ORG=xxx
SENTRY_PROJECT=xxx
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main dashboard
│   ├── login/             # Auth pages
│   ├── onboarding/        # First-time setup
│   └── api/               # API routes
├── components/
│   ├── auth/              # AuthProvider
│   ├── chat/              # Conversations UI
│   ├── cofounder/         # AI Co-Founder
│   ├── dashboard/         # Stats, charts
│   ├── invoices/          # Invoice tracker
│   ├── calendar/          # Content calendar
│   ├── settings/          # Preferences
│   ├── notifications/     # Real-time toasts
│   ├── pwa/               # PWA components
│   └── ui/                # Shared UI components
├── hooks/
│   └── useKeyboardShortcuts.ts
├── lib/
│   └── supabase.ts        # Database client
└── styles/
    └── globals.css        # Design system
```

## Key Components

### AuthProvider
Handles authentication state, business context, and onboarding redirects.

### CoFounderChat
AI chat interface with streaming responses, memory, and suggested actions.

### Real-time Updates
Uses Supabase Realtime for live conversation and stats updates.

### PWA Features
- Installable on mobile/desktop
- Offline support with cached pages
- Push notification ready

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Dashboard |
| `2` | Co-Founder |
| `3` | Messages |
| `4` | Invoices |
| `5` | Calendar |
| `6` | Settings |
| `/` | Search |
| `?` | Show shortcuts |

## Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Vercel
npx vercel --prod
```

## Mobile Responsiveness

- All views optimized for mobile
- 44px+ touch targets
- Bottom navigation on mobile
- Card-based layouts for small screens

## Performance

- Lazy loading with Suspense
- Optimistic UI updates
- Skeleton loading states
- Image optimization with next/image
