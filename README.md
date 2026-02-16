# GhostOps

**AI Co-Founder In Your Pocket** — Run your entire business from text messages.

GhostOps is an AI-powered SMS business assistant that handles customer communications, invoicing, social media, and missed call recovery — all via text message. No app required.

## Live Demo

- **Dashboard**: https://dashboard-kappa-inky-19.vercel.app
- **Landing Page**: https://landing-psi-wheat.vercel.app
- **Demo Login**: `demo@ghostops.test` / `DemoPass123`

## Features

### For Business Owners (via SMS)
- **Daily Briefings** — Get your schedule, unpaid invoices, and new reviews every morning
- **SMS Invoicing** — Text "invoice John $500 for plumbing" → Stripe payment link sent
- **AI Social Media** — Send a photo → AI generates Instagram/Facebook posts
- **Missed Call Recovery** — AI texts back within 60 seconds, books appointments
- **Business Stats** — Text "how much did I make this month" for instant reports

### Dashboard Features
- **Command Center** — Real-time stats, activity feed, and quick actions
- **AI Co-Founder Chat** — Strategic business advice and task automation
- **Conversation Management** — View and manage all customer SMS threads
- **Invoice Tracking** — Monitor payments, send reminders
- **Content Calendar** — Schedule and track social media posts
- **Settings** — Configure AI behavior, business hours, auto-responses

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, Express.js |
| **Database** | Supabase (PostgreSQL + Row Level Security) |
| **AI** | Anthropic Claude SDK |
| **SMS/Voice** | Twilio |
| **Payments** | Stripe |
| **Deployment** | Vercel |
| **Monitoring** | Sentry, Vercel Analytics |

## Project Structure

```
ghostops/
├── dashboard/          # Next.js business dashboard (PWA)
│   ├── src/
│   │   ├── app/        # App router pages
│   │   ├── components/ # React components
│   │   ├── hooks/      # Custom React hooks
│   │   └── lib/        # Utilities (supabase, etc.)
│   └── public/         # Static assets, PWA icons
│
├── landing/            # Next.js marketing site
│   ├── src/app/        # Landing page + API routes
│   └── public/         # Assets, OG images
│
├── src/                # Backend server (Express)
│   ├── api/webhooks/   # Twilio, Stripe webhooks
│   ├── lib/            # Core libs (claude, twilio, stripe)
│   └── workers/        # Background jobs
│
└── supabase/           # Database migrations
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Twilio account
- Stripe account
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone https://github.com/Hempp/ghostops.git
cd ghostops

# Install dependencies
npm install
cd dashboard && npm install && cd ..
cd landing && npm install && cd ..

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Development

```bash
# Start backend server
npm run dev

# Start dashboard (in another terminal)
cd dashboard && npm run dev

# Start landing page (in another terminal)
cd landing && npm run dev
```

### Deployment

Both dashboard and landing are configured for Vercel:

```bash
# Deploy dashboard
cd dashboard && npx vercel --prod

# Deploy landing
cd landing && npx vercel --prod
```

## Environment Variables

### Dashboard (`dashboard/.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Anthropic (for Co-Founder AI)
ANTHROPIC_API_KEY=sk-ant-xxx

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=ghostops-dashboard
```

### Landing (`landing/.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxxxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Backend (`/.env`)

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxxxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
```

## Database Schema

Key tables in Supabase:

| Table | Purpose |
|-------|---------|
| `businesses` | Business profiles and settings |
| `contacts` | Customer contact information |
| `conversations` | SMS conversation threads |
| `messages` | Individual SMS messages |
| `invoices` | Payment tracking |
| `daily_stats` | Analytics and metrics |
| `social_posts` | Scheduled social media content |
| `cofounder_memory` | AI conversation context |

## API Endpoints

### Webhooks
- `POST /api/webhooks/twilio/sms` — Incoming SMS handler
- `POST /api/webhooks/twilio/voice` — Missed call handler
- `POST /api/webhooks/stripe` — Payment events

### Co-Founder AI
- `POST /api/cofounder` — Chat with AI
- `GET /api/cofounder/insights` — Get business insights
- `GET /api/cofounder/goals` — Get/set business goals

### Cron Jobs
- `GET /api/cron/daily-briefing` — Morning briefing (7 AM)
- `GET /api/cron/hourly-check` — Check for tasks
- `GET /api/cron/weekly-strategy` — Weekly review

## Monitoring

### Sentry
- Error tracking with session replay
- Performance monitoring
- Source map uploads

### Vercel Analytics
- Page views and visitors
- Core Web Vitals (LCP, FID, CLS)
- Real-time dashboard

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with Claude Code by Anthropic
