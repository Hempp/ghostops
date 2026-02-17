# GhostOps Pricing Model

## 1. Infrastructure Cost Analysis

### Fixed Monthly Costs (Platform)

| Service | Plan | Monthly Cost | Notes |
|---------|------|--------------|-------|
| **Supabase** | Pro | $25 | 8GB DB, 100K MAUs, 100GB storage |
| **Vercel** | Pro | $20 | 1TB bandwidth, 1M function invocations |
| **Domain/SSL** | - | ~$2 | Amortized annual cost |
| **Total Fixed** | - | **$47/month** | Shared across all customers |

### Variable Costs Per Customer (Monthly)

| Service | Usage Assumption | Cost/Customer |
|---------|------------------|---------------|
| **Claude API (Haiku 3.5)** | 50 conversations, ~100K tokens | $0.30 |
| **Claude API (Sonnet 4.5)** | Heavy users, ~200K tokens | $1.50 |
| **Twilio SMS** | 200 messages/month | $1.58 |
| **Twilio Phone Number** | 1 local number | $1.15 |
| **Supabase MAU** | 1 active user | $0.00325 |
| **Supabase Storage** | ~50MB per customer | ~$0.01 |
| **Stripe Fees** | 2.9% + $0.30 per charge | Varies |

### Cost Per Customer Tiers

| Customer Type | AI Usage | SMS Volume | **Total Variable Cost** |
|---------------|----------|------------|-------------------------|
| Light | Haiku only, 30 convos | 100 SMS | **$1.40/mo** |
| Moderate | Mixed AI, 75 convos | 250 SMS | **$3.50/mo** |
| Heavy | Sonnet primary, 150 convos | 500 SMS | **$7.00/mo** |
| Power | Opus for strategy, 300 convos | 1000 SMS | **$15.00/mo** |

---

## 2. Recommended Pricing Tiers

### Tier 1: Starter - $29/month

**Target:** Solo operators, side hustles, testing the waters

| Feature | Limit |
|---------|-------|
| SMS Messages | 100/month |
| AI Conversations | 50/month |
| AI Model | Haiku 3.5 |
| Phone Numbers | 1 |
| Contacts | 250 |
| Invoices | 10/month |
| Daily Briefings | Yes |
| Weekly Strategy | No |

**Unit Economics:**
- Revenue: $29
- Variable Cost: ~$1.50
- Stripe Fee: $1.14
- **Gross Margin: $26.36 (91%)**

---

### Tier 2: Growth - $79/month (Recommended)

**Target:** Active small businesses, service providers

| Feature | Limit |
|---------|-------|
| SMS Messages | 500/month |
| AI Conversations | 200/month |
| AI Model | Sonnet 4.5 |
| Phone Numbers | 2 |
| Contacts | 2,500 |
| Invoices | Unlimited |
| Daily Briefings | Yes |
| Weekly Strategy | Yes |
| AI Actions | Auto-approve simple |
| Custom AI Persona | Yes |

**Unit Economics:**
- Revenue: $79
- Variable Cost: ~$5.50
- Stripe Fee: $2.59
- **Gross Margin: $70.91 (90%)**

---

### Tier 3: Pro - $199/month

**Target:** Established businesses, teams, high volume

| Feature | Limit |
|---------|-------|
| SMS Messages | 2,000/month |
| AI Conversations | Unlimited |
| AI Model | Sonnet + Opus for strategy |
| Phone Numbers | 5 |
| Contacts | Unlimited |
| Invoices | Unlimited |
| Daily Briefings | Yes |
| Weekly Strategy | Yes + Monthly Review |
| AI Actions | Full automation |
| Custom AI Persona | Yes |
| Priority Support | Yes |
| API Access | Yes |

**Unit Economics:**
- Revenue: $199
- Variable Cost: ~$15.00
- Stripe Fee: $6.07
- **Gross Margin: $177.93 (89%)**

---

### Tier 4: Enterprise - Custom ($500+/month)

**Target:** Multi-location, franchises, agencies

| Feature | Included |
|---------|----------|
| Everything in Pro | Yes |
| Multiple Businesses | Up to 10 |
| White-label Option | Yes |
| Dedicated Support | Yes |
| Custom Integrations | Yes |
| SLA Guarantee | 99.9% uptime |
| Onboarding Session | Included |

---

## 3. Add-Ons & Usage-Based Pricing

| Add-On | Price |
|--------|-------|
| Extra SMS Bundle (500) | $15 |
| Extra Phone Number | $5/month |
| MMS Messages | $0.03 each |
| Voice Minutes | $0.02/min |
| Additional Business | $25/month |
| White-label Branding | $99/month |

---

## 4. Revenue Projections

### Scenario: 100 Customers

| Tier | % of Customers | MRR | Variable Costs | Gross Profit |
|------|----------------|-----|----------------|--------------|
| Starter ($29) | 40% (40) | $1,160 | $60 | $1,100 |
| Growth ($79) | 45% (45) | $3,555 | $248 | $3,307 |
| Pro ($199) | 15% (15) | $2,985 | $225 | $2,760 |
| **Total** | **100** | **$7,700** | **$533** | **$7,167** |

**Fixed Costs:** $47/month
**Stripe Fees (~3.5%):** $270/month
**Net Before OpEx:** $6,850/month

### Scenario: 1,000 Customers

| Metric | Value |
|--------|-------|
| Blended ARPU | $77 |
| Total MRR | $77,000 |
| Variable Costs | $5,330 |
| Fixed Costs | $200 (scaled Supabase/Vercel) |
| Stripe Fees | $2,695 |
| **Gross Profit** | **$68,775 (89%)** |

---

## 5. Competitive Positioning

| Competitor | Price | What They Offer |
|------------|-------|-----------------|
| Podium | $399+ | SMS + Reviews |
| Birdeye | $299+ | SMS + Reviews + Social |
| SimpleTexting | $39+ | SMS only |
| Textedly | $24+ | SMS only |
| **GhostOps** | **$29-199** | **SMS + AI Co-Founder + Invoicing** |

**Differentiation:** GhostOps is the only platform with an AI Co-Founder that proactively manages your business communications, not just sends texts.

---

## 6. Launch Strategy Recommendations

### Phase 1: Validation (Month 1-2)
- **Price:** $29/month (single tier)
- **Goal:** Get 20-50 paying customers
- **Offer:** "Founding Member" rate, locked forever

### Phase 2: Expansion (Month 3-6)
- **Add:** Growth tier at $79
- **Goal:** 100+ customers, validate tier demand
- **Offer:** Annual discount (2 months free)

### Phase 3: Scale (Month 6+)
- **Add:** Pro tier at $199
- **Goal:** 500+ customers
- **Focus:** Retention, reduce churn, add features

---

## 7. Key Metrics to Track

| Metric | Target |
|--------|--------|
| CAC (Customer Acquisition Cost) | < $100 |
| LTV (Lifetime Value) | > $500 |
| LTV:CAC Ratio | > 5:1 |
| Monthly Churn | < 5% |
| Gross Margin | > 85% |
| NPS Score | > 50 |

---

## Sources

- [Anthropic Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Twilio SMS Pricing US](https://www.twilio.com/en-us/sms/pricing/us)
- [Supabase Pricing](https://supabase.com/pricing)
- [Vercel Pricing](https://vercel.com/pricing)
- [Stripe Pricing & Fees](https://stripe.com/pricing)
