# Apex Decision Engine — Deployment Guide

This document covers a complete fresh deployment of ADE from scratch.
Follow the steps in order — some steps depend on values obtained in earlier steps.

---

## Prerequisites

Before you begin, create accounts on these services (all have free tiers that cover early-stage):

| Service | Purpose | URL |
|---------|---------|-----|
| Supabase | Auth + database | supabase.com |
| Render | Python backend hosting | render.com |
| Vercel | React frontend hosting | vercel.com |
| Stripe | Payments + subscriptions | stripe.com |
| Anthropic | Claude API (AI signals) | console.anthropic.com |
| Finnhub | Market news + options data | finnhub.io |
| Sentry *(optional)* | Error monitoring | sentry.io |

---

## Step 1 — Supabase Project Setup

### 1a. Create a project
1. Go to **supabase.com → New project**
2. Choose a region close to your users (US East recommended)
3. Save the **database password** — you'll need it if you ever connect directly

### 1b. Collect your keys
Go to **Settings → API** and copy:
- **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`
- **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`
- **JWT Secret** → `SUPABASE_JWT_SECRET`

### 1c. Configure Auth
1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel URL: `https://apex-decision-engine.vercel.app`
3. Under **Redirect URLs**, add:
   - `https://apex-decision-engine.vercel.app/auth/callback`
   - `http://localhost:5173/auth/callback` (for local dev)
4. Under **Auth → Email Templates**, customize if desired (optional)

### 1d. Run database migrations
In the Supabase Dashboard, go to **SQL Editor** and run each migration file **in order**:

```
supabase/migrations/001_init.sql
supabase/migrations/002_preferences.sql
supabase/migrations/003_accuracy.sql
supabase/migrations/004_analytics.sql
```

Paste each file's contents into the SQL Editor and click **Run**.
If a migration fails, check for error messages — most commonly a table already exists.

> **Alternative**: If you have the Supabase CLI installed, run:
> ```bash
> supabase db push
> ```

---

## Step 2 — Anthropic API Key

1. Go to **console.anthropic.com → API Keys → Create Key**
2. Copy the key → `ANTHROPIC_API_KEY`
3. Note: ADE uses `claude-sonnet-4-20250514` by default (`ANTHROPIC_MODEL`)

---

## Step 3 — Stripe Setup

### 3a. Create products
In **Stripe Dashboard → Products → Add product**, create three products:

| Product Name | Billing | Price | Price ID env var |
|-------------|---------|-------|-----------------|
| ADE EDGE | Monthly | $29.00 | `STRIPE_PRICE_EDGE` |
| ADE ALPHA | Monthly | $59.00 | `STRIPE_PRICE_ALPHA` |
| ADE APEX | Monthly | $119.00 | `STRIPE_PRICE_APEX` |

After creating each, copy the **Price ID** (starts with `price_`).

### 3b. Get your secret key
**Stripe Dashboard → Developers → API Keys → Secret key** → `STRIPE_SECRET_KEY`

> Use `sk_test_...` during development, `sk_live_...` in production.

### 3c. Enable Customer Portal
**Stripe Dashboard → Settings → Billing → Customer portal → Activate**
This allows users to manage/cancel subscriptions via the portal link in Account settings.

### 3d. Configure the webhook
*(Do this after deploying the backend in Step 4)*

1. **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. Set **Endpoint URL** to: `https://apex-decision-engine.onrender.com/stripe-webhook`
3. Under **Events to listen to**, select:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Click **Add endpoint**, then copy the **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`

---

## Step 4 — Backend Deployment (Render)

### 4a. Connect repo
1. **Render Dashboard → New → Web Service**
2. Connect your GitHub/GitLab repo
3. Render will detect `render.yaml` automatically — confirm the settings

### 4b. Set environment variables
In **Render Dashboard → your service → Environment**, add every variable from `.env.example`.
Variables marked `sync: false` in render.yaml must be set manually here.

**Minimum required for the app to start:**

```
SUPABASE_URL
SUPABASE_JWT_SECRET
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
APP_URL
CORS_ORIGINS
```

**Required for billing to work:**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_EDGE
STRIPE_PRICE_ALPHA
STRIPE_PRICE_APEX
```

**Recommended:**
```
ADMIN_SECRET_KEY    (protects /admin/* endpoints)
FINNHUB_API_KEY     (enables news, options flow, calendar)
SENTRY_DSN          (error monitoring)
```

### 4c. Set health check URL
In **Render → your service → Settings → Health & Alerts**:
- **Health Check Path**: `/health`

This prevents Render from marking the service as down during cold starts.

### 4d. Prevent cold starts (important for UX)
Render's free tier spins down after 15 minutes of inactivity, causing a ~30-second cold start.
Options:
- **Upgrade to Render Starter ($7/mo)** — no spin-downs, recommended for production
- The backend has a self-ping loop built in (`_self_ping_loop` in app.py) that pings `/health` every 10 minutes — this works on the free tier but is not guaranteed

### 4e. Verify backend is live
```bash
curl https://apex-decision-engine.onrender.com/health
# Expected: {"status": "ok"}
```

---

## Step 5 — Frontend Deployment (Vercel)

### 5a. Connect repo
1. **Vercel Dashboard → Add New Project → Import Git Repository**
2. Set **Root Directory** to `web/frontend`
3. Set **Framework Preset** to **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

### 5b. Set environment variables
In **Vercel → Project → Settings → Environment Variables**, add:

```
VITE_SUPABASE_URL          = (your Supabase project URL)
VITE_SUPABASE_ANON_KEY     = (your Supabase anon key)
VITE_API_URL               = https://apex-decision-engine.onrender.com
VITE_APP_URL               = https://apex-decision-engine.vercel.app
VITE_SENTRY_DSN            = (optional, from sentry.io)
```

Set environment to **Production** for all of these.

### 5c. SPA routing
The file `web/frontend/vercel.json` already contains the required rewrite rule:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
This ensures direct URL access to `/dashboard`, `/signals`, etc. does not 404.
**No additional configuration needed.**

### 5d. Redeploy
After setting env vars, trigger a redeploy: **Vercel → Deployments → Redeploy**.

---

## Step 6 — Sentry Setup (Optional but Recommended)

1. **sentry.io → New Project → React** → copy DSN → set as `VITE_SENTRY_DSN` on Vercel
2. **sentry.io → New Project → Python (FastAPI)** → copy DSN → set as `SENTRY_DSN` on Render
3. Redeploy both services after setting the DSNs
4. Verify: open the app, trigger an error (or throw one in devtools console), confirm it appears in Sentry within 30 seconds

---

## Step 7 — Post-Deployment Verification

Run through this checklist after every fresh deployment:

### Auth
- [ ] Sign up with a new email → receive confirmation email → click link → redirected to `/auth/callback` → auto-logged in to `/dashboard`
- [ ] Sign out → attempt to visit `/dashboard` → redirected to `/login`
- [ ] Forgot password → receive email → click link → reset password → can sign in with new password

### Billing
- [ ] Free user sees grayed-out Signal Hub preview and "Upgrade" CTA
- [ ] Click "Upgrade to EDGE" → Stripe Checkout opens with correct plan and price
- [ ] Complete test payment (use Stripe test card `4242 4242 4242 4242`) → redirected back to app → tier updates to EDGE without page refresh
- [ ] Go to `/account` → "Manage Subscription" button opens Stripe Customer Portal
- [ ] Cancel from portal → webhook fires → tier reverts to free → user sees toast notification

### Signals
- [ ] EDGE user requests a signal → Claude API call fires → signal appears with verdict and confidence score
- [ ] Free user on `/dashboard` → no Claude API calls triggered (check Render logs)
- [ ] Request same symbol twice within 15 minutes → only one Claude API call in logs (cache working)

### Backend health
```bash
curl https://apex-decision-engine.onrender.com/health
# {"status": "ok"}

curl https://apex-decision-engine.onrender.com/market-regime
# {"regime": "BULL"|"BEAR"|"HIGH_VOLATILITY", ...}
```

---

## Environment Variable Reference

### Backend (set on Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_JWT_SECRET` | ✅ | Used to validate user JWTs |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side DB access |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `ANTHROPIC_MODEL` | ✅ | Default: `claude-sonnet-4-20250514` |
| `STRIPE_SECRET_KEY` | ✅ | Stripe server-side key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signature verification |
| `STRIPE_PRICE_EDGE` | ✅ | Stripe Price ID for EDGE ($29/mo) |
| `STRIPE_PRICE_ALPHA` | ✅ | Stripe Price ID for ALPHA ($59/mo) |
| `STRIPE_PRICE_APEX` | ✅ | Stripe Price ID for APEX ($119/mo) |
| `APP_URL` | ✅ | Frontend URL (no trailing slash) |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins |
| `DATA_SOURCE` | ✅ | `yahoo` or `mock` |
| `FINNHUB_API_KEY` | ⚠️ | Required for news/calendar features |
| `ADMIN_SECRET_KEY` | ⚠️ | Required to use `/admin/*` endpoints |
| `SENTRY_DSN` | ☑️ | Optional error monitoring |
| `PORT` | ☑️ | Injected by Render automatically |

### Frontend (set on Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase public anon key |
| `VITE_API_URL` | ✅ | Render backend URL |
| `VITE_APP_URL` | ✅ | This frontend's URL (for auth redirects) |
| `VITE_SENTRY_DSN` | ☑️ | Optional frontend error monitoring |

---

## Updating After Changes

### Backend changes
Push to main → Render auto-deploys (if auto-deploy is enabled in Render settings).
Or trigger manually: **Render Dashboard → Manual Deploy → Deploy latest commit**.

### Frontend changes
Push to main → Vercel auto-deploys.
Or trigger manually: **Vercel Dashboard → Deployments → Redeploy**.

### Database migrations
New migration files must be run manually in the Supabase SQL editor.
Files are in `supabase/migrations/` — run in ascending numeric order.

---

## Rollback

**Backend (Render):** Render Dashboard → Deploys → click any past deploy → **Rollback to this deploy**

**Frontend (Vercel):** Vercel Dashboard → Deployments → click any past deployment → **Promote to Production**

**Database:** Supabase does not support automatic rollback. Write rollback SQL manually if a migration needs to be undone.
