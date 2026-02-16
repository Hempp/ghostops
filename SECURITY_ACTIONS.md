# GhostOps Security Actions Required

## CRITICAL: Secrets Rotation Required

The security audit found exposed credentials. **Rotate these immediately:**

### 1. Supabase Credentials (CRITICAL)
- **What:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Why:** Service role key has full database access
- **Action:**
  1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API
  2. Generate new API keys (this invalidates old ones)
  3. Update `.env` with new values
  4. Redeploy all services

### 2. Anthropic API Key (CRITICAL)
- **What:** `ANTHROPIC_API_KEY`
- **Why:** Can be used to make API calls on your account
- **Action:**
  1. Go to [Anthropic Console](https://console.anthropic.com) → API Keys
  2. Delete the exposed key
  3. Generate a new key
  4. Update `.env` with new value

### 3. Stripe Credentials (HIGH)
- **What:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Why:** Can access payment data and create charges
- **Action:**
  1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys
  2. Roll the secret key
  3. Update webhook endpoint secret in Webhooks section
  4. Update `.env` with new values

### 4. Twilio Credentials (HIGH)
- **What:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- **Why:** Can send SMS on your account
- **Action:**
  1. Go to [Twilio Console](https://console.twilio.com) → Account → API keys
  2. Create new API key
  3. Update `.env` with new values

### 5. WhatsApp Verify Token (MEDIUM)
- **What:** `WHATSAPP_VERIFY_TOKEN`
- **Why:** Currently uses weak/predictable token
- **Action:**
  1. Generate a strong random token: `openssl rand -hex 32`
  2. Update in Meta Business Settings
  3. Update `.env`

---

## Environment Variable Security

### Add to `.env`:
```bash
# Internal API key for service-to-service calls
INTERNAL_API_KEY=<generate with: openssl rand -hex 32>
```

### Ensure `.env` is in `.gitignore`:
```bash
# Check .gitignore includes .env
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
```

### Remove `.env` from git history (if committed):
```bash
# WARNING: This rewrites history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

---

## Database Security

### Apply RLS Policies
Run the new migration in Supabase SQL Editor:
```bash
cat supabase/migrations/003_security_rls_policies.sql
```

### Create business_users table
The RLS migration creates a `business_users` table to associate authenticated users with businesses. After running the migration:

1. Add yourself as an owner:
```sql
INSERT INTO business_users (user_id, business_id, role)
VALUES ('your-supabase-user-id', 'your-business-id', 'owner');
```

---

## Webhook Security Checklist

- [x] Twilio signature verification added
- [x] Stripe signature verification (already existed)
- [x] Rate limiting added to all webhooks
- [ ] WhatsApp signature verification (uses HMAC-SHA256 from Meta)

---

## API Security Checklist

- [x] Authentication middleware added
- [x] Business authorization middleware added
- [x] Rate limiting on API endpoints
- [x] Pagination limits added (max 100-200 per request)

---

## Next Steps

1. **Immediately:** Rotate all credentials listed above
2. **Today:** Run RLS migration in Supabase
3. **This week:** Set up proper secrets management (consider: AWS Secrets Manager, HashiCorp Vault, or 1Password CLI)
4. **Ongoing:** Enable Supabase audit logs for security monitoring
