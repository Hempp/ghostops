# GhostOps Landing Page

Marketing site for GhostOps with Stripe checkout, Twilio webhooks, and dynamic OG images.

## Live Site

https://landing-psi-wheat.vercel.app

## Features

- **Marketing Landing Page** — Premium design with animations
- **Stripe Checkout** — Three pricing tiers with subscription
- **Twilio Webhooks** — SMS and voice handlers
- **Dynamic OG Images** — Generated with Next.js ImageResponse
- **SEO Optimized** — Full meta tags, JSON-LD structured data

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Payments**: Stripe
- **SMS**: Twilio
- **Monitoring**: Sentry + Vercel Analytics

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your API keys

# Start development server
npm run dev
```

Open http://localhost:3001

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=xxx
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── success/              # Post-checkout page
│   ├── og-image.png/         # Dynamic OG image
│   ├── global-error.tsx      # Error boundary
│   ├── layout.tsx            # Root layout + SEO
│   └── api/
│       ├── checkout/         # Stripe checkout
│       ├── cron/             # Scheduled tasks
│       └── webhooks/
│           ├── stripe/       # Payment webhooks
│           └── twilio/       # SMS/voice webhooks
├── globals.css               # Design system
└── instrumentation.ts        # Sentry init
```

## API Routes

### POST /api/checkout
Creates Stripe checkout session for subscription.

```typescript
// Request
{ plan: 'starter' | 'pro' | 'agency' }

// Response
{ url: 'https://checkout.stripe.com/...' }
```

### POST /api/webhooks/stripe
Handles Stripe events:
- `checkout.session.completed` — New subscription
- `invoice.paid` — Successful payment
- `customer.subscription.deleted` — Cancellation

### POST /api/webhooks/twilio/sms
Handles incoming SMS messages:
- Routes to AI for response
- Creates/updates conversations
- Logs to database

### POST /api/webhooks/twilio/voice
Handles missed calls:
- Sends follow-up SMS
- Creates lead in system

### GET /api/cron/daily
Daily briefing cron job (configure in Vercel):
- Sends morning summary SMS to business owners

## SEO Features

### Meta Tags
- Open Graph (Facebook, LinkedIn)
- Twitter Cards
- Canonical URL
- Robots directives

### Structured Data
JSON-LD SoftwareApplication schema with:
- Pricing information
- Feature list
- Aggregate ratings

### Dynamic OG Image
Generated at `/og-image.png` using Next.js ImageResponse:
- 1200x630 dimensions
- GhostOps branding
- Feature highlights

## Pricing Tiers

| Plan | Price | Features |
|------|-------|----------|
| Starter | $79/mo | Missed call, invoicing, 500 msgs |
| Pro | $197/mo | + Social media, reviews, unlimited |
| Agency | $499/mo | + 5 locations, team, API access |

## Design

Uses same design system as dashboard:

```css
:root {
  --ghost-bg: #07080a;
  --ghost-card: #111318;
  --accent-primary: #10b981;
}
```

Animations:
- `animate-fade-in-up` — Content reveal
- `animate-float` — Phone mockup
- `animate-slide-in-left/right` — Floating cards

## Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Vercel
npx vercel --prod
```

## Stripe Setup

1. Create products in Stripe Dashboard
2. Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Subscribe to events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.deleted`

## Twilio Setup

1. Get a phone number in Twilio Console
2. Set SMS webhook: `https://your-domain.com/api/webhooks/twilio/sms`
3. Set Voice webhook: `https://your-domain.com/api/webhooks/twilio/voice`
