# RevOps Pulse

RevOps Pulse is a standalone paid-lifetime-access application. It does not use or share GTM Academy assessment data, personalised resources, databases, bindings, users, or entitlements.

## Architecture

- Next.js 16 App Router remains a static export (`output: "export"`). Cloudflare Pages serves `out/`.
- Cloudflare Pages Functions in `functions/` provide authentication, persistence, Checkout, and webhooks. There is no Next.js server and no separate Worker.
- One dedicated D1 database is bound as `REVOPS_DB`. No Academy binding or table is permitted.
- `public/_routes.json` invokes Functions only for `/`, `/feed-data.json`, and `/api/*`. Next assets and public pages (`/login/`, `/buy/`, `/checkout/success/`) stay public.
- Middleware redirects unauthenticated dashboard requests and returns no-store JSON errors for private APIs and the feed. Sessions and login links are opaque random values; only SHA-256 hashes are stored.
- Stripe webhooks are the only entitlement authority. The success page never authenticates a Checkout Session ID; after D1 contains a qualifying paid order, it sends an idempotent one-time link to the normalized order email, and mailbox proof creates the session.

## Local Checks

```bash
npm ci
npm test
npm run lint
npm run build
```

The build fetches RSS sources and generates ignored `public/feed-data.json`, which Next copies to `out/feed-data.json`. Feed validation fails the build before writing when no valid items were produced, so a failed refresh cannot replace the currently deployed Pages version with an empty feed. The build then hashes Next's inline hydration scripts into the deployed `out/_headers` CSP, avoiding `unsafe-inline` for scripts. Never commit the feed file. For local Pages testing, create an untracked `.dev.vars` from `.dev.vars.example`, create a local D1 database, apply `migrations/0001_revops.sql`, and run Pages locally with the `REVOPS_DB` binding. Do not use a remote Wrangler command for local verification.

## Pages Deployment

Configure the Pages project in the partner-owned Cloudflare account. Access, billing, retention, and incident ownership remain with that partner; do not attach this application to GTM Academy resources.

- Build command: `npm run build`
- Build output directory: `out`
- Root directory: repository root
- Functions directory: `functions` (Pages convention)
- D1 binding: exactly `REVOPS_DB`, pointing to a dedicated RevOps Pulse database
- Compatibility date: use a reviewed current date for the Pages project and review it periodically
- Pages Functions failure mode: **fail closed / block requests**. Never configure fail-open behavior, because an invocation failure must not expose `/`, `/feed-data.json`, or private APIs as static assets.

Apply D1 migrations in filename order, once per environment:

1. `migrations/0001_revops.sql`

Back up the D1 database before future destructive migrations. This initial migration is additive and has no Academy tables.

## Variables And Secrets

Set these non-secret Pages variables:

- `APP_ORIGIN`: exact canonical HTTPS origin, with no path, query, or fragment
- `DEPLOYMENT_ENV=staging`
- `CHECKOUT_ENABLED=true`
- `STRIPE_ENVIRONMENT=sandbox`
- `STRIPE_PRICE_ID`: sandbox one-time Price ID
- `STRIPE_PRODUCT_ID`: expected sandbox Product ID
- `STRIPE_PRICE_AMOUNT`: expected positive integer minor-unit amount
- `STRIPE_PRICE_CURRENCY`: expected lowercase three-letter currency
- `RESEND_FROM`: verified sender identity

Set these as encrypted Pages secrets, never repository values:

- `STRIPE_RESTRICTED_KEY`: a least-privilege sandbox restricted key with the required Price read, Checkout Session create/read, and Charge read permissions; code requires the `rk_test_` prefix
- `STRIPE_WEBHOOK_SECRET`: signing secret for this endpoint/environment only
- `RESEND_API_KEY`: dedicated least-privilege key for RevOps Pulse magic links

The initial approved sandbox price is a EUR 5.00 one-time purchase, configured as `STRIPE_PRICE_AMOUNT=500` and `STRIPE_PRICE_CURRENCY=eur`. Product and Price IDs remain unset until their dedicated sandbox objects are approved and created. Checkout remains disabled unless all exact staging/sandbox flags, IDs, amount, currency, and a restricted test key are configured. The server re-reads the Price and requires `active=true`, `type=one_time`, `livemode=false`, and exact product/currency/amount matches. The integration does not set `payment_method_types`, automatic tax, or post-payment invoices.

Price changes apply only to future Checkout Sessions. Create a new Stripe Price and update the environment's expected Price ID, amount, and currency together; do not mutate historical orders or entitlements. Existing valid purchases retain lifetime access regardless of which retired Price granted them.

`APP_ORIGIN` is also the mutation Origin allowlist and must match the deployed origin exactly. Preview URLs therefore need their own isolated configuration and database or checkout must remain disabled.

## Stripe Runbook

Use a separate Stripe sandbox, not shared test mode and never live mode. Register `https://<origin>/api/stripe/webhook` for exactly these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.funds_withdrawn`
- `charge.dispute.closed`

Verify the webhook endpoint in the sandbox before enabling checkout. Fulfillment requires a paid non-live session whose single line item, Product, Price, amount, and currency match server configuration and the stored checkout attempt. Refund and dispute events create durable PaymentIntent tombstones in the same atomic D1 batch as their event ledger transition. Entitlement reconciliation considers every qualifying non-revoked order, so out-of-order events cannot reactivate a revoked payment and refunding one purchase preserves access backed by another valid purchase.

## Authentication And Operations

Magic-link requests always return the same public response. Eligible users receive a 15-minute, one-time fragment token; per-email requests are limited to three per 15-minute D1 window. Checkout completion claims its request key before throttle accounting, suppresses concurrent/immediate duplicates, and allows a fresh token after the 15-minute token window. Sessions expire after 30 days and can be deleted through logout. Lifetime entitlements have no expiry but are revoked for refunds or disputes.

Before production, add Cloudflare Turnstile to public login and checkout requests under a separately approved Cloudflare resource change. It is deliberately not included here. Also establish support, refund, privacy, data-retention, Resend-domain, and incident-response procedures.

## Rollback

1. Set `CHECKOUT_ENABLED=false` first to stop new purchases.
2. Roll Pages back to the prior known-good deployment, while keeping the dedicated D1 database and webhook endpoint available.
3. Do not roll back or delete D1 rows blindly. Reconcile Stripe events/orders and active entitlements before any schema or data restoration.
4. If webhook processing is impaired, restore it before checkout; success-page visits never grant entitlements.
5. Rotate Stripe/Resend secrets if exposure is suspected and invalidate sessions by deleting the affected hashed session rows.
