# GhostOps - SMS AI Business Assistant

## Project Overview

GhostOps is an AI-powered SMS business assistant platform that helps small businesses automate customer communications, invoicing, and marketing.

## Tech Stack

- **Backend**: Express.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude SDK
- **SMS/Voice**: Twilio
- **Payments**: Stripe
- **Frontend**: Next.js (dashboard + landing)
- **Deployment**: Vercel

## Project Structure

```
ghostops/
├── src/                    # Main backend server
│   ├── api/webhooks/       # Twilio, Stripe, leads webhooks
│   ├── lib/                # Core libraries (claude, twilio, stripe)
│   └── workers/            # Background jobs
├── dashboard/              # Next.js business dashboard
├── landing/                # Next.js marketing site + API routes
├── supabase/               # Database migrations and config
└── functions/              # Legacy Firebase functions
```

## Development

```bash
# Start backend server
npm run dev

# Start dashboard
npm run dashboard

# Start landing page
cd landing && npm run dev
```

## Plugins

### NEXUS-PRIME Plugin

This project uses **NEXUS-PRIME v3.2** - a master AI orchestration system with 81+ agents and 60 skills.

**Core Commands:**
- `/nexus` - Activate NEXUS-PRIME orchestrator
- `/nexus-status` - Show system status and active agents
- `/nexus-help` - Display all available commands

**Team Deployments:**
- `/deploy-forge` - Software Engineering team (FORGE-X)
- `/deploy-ux` - UX/UI Design team (PRISM-UX)
- `/deploy-ops` - DevOps/SRE team (NEXUS-OPS)
- `/deploy-supabase` - Backend/Database team (SUPA-MASTER)
- `/deploy-vercel` - Deployment team (DEPLOY-MASTER)
- `/deploy-github` - Version Control team (REPO-MASTER)
- `/deploy-sentinel-qa` - QA Automation (SENTINEL-QA)

**Workflow Commands:**
- `/workflow-bootstrap` - Initialize new project with best practices
- `/workflow-audit` - Run security + performance + code audit
- `/workflow-release` - Automated release pipeline

### UX/UI Mastery Plugin

This project uses the **ux-ui-mastery** plugin for design expertise.

**Available Commands:**
- `/ux-audit` - Run UX heuristics audit
- `/accessibility-check` - WCAG 2.2 compliance check
- `/design-review` - Comprehensive design review
- `/generate-design-tokens` - Create design token system
- `/ai-ux-audit` - Audit AI interface patterns
- `/ux-metrics-plan` - HEART metrics planning
- `/component-build` - Build production components
- `/design-critique` - Structured design critique
- `/figma-to-code` - Convert Figma to code
- `/cognitive-check` - Cognitive psychology analysis

## Code Standards

- Use TypeScript strict mode
- Follow existing patterns in the codebase
- Add proper error handling for external services
- Keep SMS responses concise (160 char limit awareness)

## Environment Variables

Required in `.env`:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
