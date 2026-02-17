# GhostOps Setup Guide

Complete guide to setting up GhostOps for development and production.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

## 1. Clone & Install

```bash
git clone https://github.com/Hempp/ghostops.git
cd ghostops

# Install root dependencies
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..

# Install landing dependencies
cd landing && npm install && cd ..
```

## 2. Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
3. Choose organization, name it "ghostops"
4. Set a strong database password (save this!)
5. Select region closest to your users

### Get Credentials

After project creates:

1. Go to **Settings > API**
2. Copy these values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## 3. Twilio Setup

### Create Account

1. Go to [twilio.com](https://www.twilio.com) and sign up
2. Complete verification

### Get Phone Number

1. Go to **Phone Numbers > Manage > Buy a Number**
2. Search for number with SMS + Voice capability
3. Purchase number

### Get Credentials

1. Go to **Account > API keys & tokens**
2. Copy:
   - `Account SID` → `TWILIO_ACCOUNT_SID`
   - `Auth Token` → `TWILIO_AUTH_TOKEN`
   - Your phone number → `TWILIO_PHONE_NUMBER` (format: +1XXXXXXXXXX)

### Configure Webhooks

After deploying landing page:

1. Go to **Phone Numbers > Manage > Active Numbers**
2. Click your number
3. Under "Messaging":
   - Webhook URL: `https://your-landing-domain.com/api/webhooks/twilio/sms`
   - Method: POST
4. Under "Voice":
   - Webhook URL: `https://your-landing-domain.com/api/webhooks/twilio/voice`
   - Method: POST

## 4. Stripe Setup

### Create Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete business verification

### Get API Keys

1. Go to **Developers > API Keys**
2. Copy:
   - `Secret key` → `STRIPE_SECRET_KEY`

### Create Products

1. Go to **Products > Add Product**
2. Create three subscription products:

| Product | Price | Price ID Env Var |
|---------|-------|------------------|
| Starter | $29/month | STRIPE_STARTER_PRICE_ID |
| Growth | $79/month | STRIPE_GROWTH_PRICE_ID |
| Pro | $199/month | STRIPE_PRO_PRICE_ID |

3. Copy each price ID and add to your environment variables

### Configure Webhook

After deploying:

1. Go to **Developers > Webhooks**
2. Click "Add endpoint"
3. URL: `https://your-landing-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.deleted`
5. Copy `Signing secret` → `STRIPE_WEBHOOK_SECRET`

## 5. Anthropic Setup

### Get API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create account or sign in
3. Go to **API Keys**
4. Create new key → `ANTHROPIC_API_KEY`

## 6. Sentry Setup (Optional)

### Create Project

1. Go to [sentry.io](https://sentry.io) and sign up
2. Create new project, select "Next.js"
3. Copy DSN → `NEXT_PUBLIC_SENTRY_DSN`

### For Source Maps

1. Go to **Settings > Organization > Auth Tokens**
2. Create token with `project:write` scope
3. Set:
   - `SENTRY_ORG` = your org slug
   - `SENTRY_PROJECT` = your project slug
   - `SENTRY_AUTH_TOKEN` = the token

## 7. Environment Files

### Dashboard (`dashboard/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
ANTHROPIC_API_KEY=sk-ant-xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Landing (`landing/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

## 8. Vercel Deployment

### Deploy Dashboard

```bash
cd dashboard
npx vercel

# Follow prompts, then:
npx vercel --prod
```

Add environment variables in Vercel:
1. Go to project settings
2. Click "Environment Variables"
3. Add all variables from `.env.local`

### Deploy Landing

```bash
cd landing
npx vercel
npx vercel --prod
```

Add environment variables same as above.

### Configure Domains (Optional)

1. Go to project settings > Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## 9. Vercel Cron Jobs

Add to `landing/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 7 * * *"
    }
  ]
}
```

This sends daily briefings at 7 AM.

## 10. Test the Setup

### Test SMS

1. Text your Twilio number
2. Check Supabase for new conversation
3. Verify AI response

### Test Checkout

1. Go to landing page
2. Click "Start Free Trial"
3. Use Stripe test card: `4242 4242 4242 4242`

### Test Dashboard

1. Go to dashboard
2. Login with demo account
3. Test all features

## Troubleshooting

### SMS not working
- Check Twilio webhook URL is correct
- Verify phone number format (+1XXXXXXXXXX)
- Check Twilio logs for errors

### Checkout failing
- Verify Stripe keys are correct
- Check price IDs in checkout route
- Test with Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`

### AI not responding
- Verify ANTHROPIC_API_KEY is set
- Check API quota in Anthropic console
- Look for errors in Vercel logs

### Database errors
- Verify Supabase credentials
- Check Row Level Security policies
- Run migrations if tables missing

## Support

- GitHub Issues: https://github.com/Hempp/ghostops/issues
- Documentation: This file + README.md files
