# RevOps Pulse Staging Deployment Manifest

Status: **BLOCKED - LOCAL PREPARATION ONLY**

This manifest records the intended staging scope and rollback sequence. It does not authorize a push, deployment, Cloudflare account change, Stripe change, Resend change, or paid service. Replace every pending value with a verified identifier and complete the required approvals before execution.

## Immutable Scope

- Repository: `lizellevg2601-alt/revops-pulse`
- Branch: `feature/paid-lifetime-access`
- Cloudflare account: `c3974c9f555d3c107ece3f4f48defb23`
- Existing Pages project: `revops-pulse`
- Build command: `npm run build`
- Output directory: `out`
- Functions directory: `functions`
- D1 binding: `REVOPS_DB`
- Environment: staging/preview only
- Stripe mode: dedicated sandbox only
- Price: one-time EUR 5.00 (`unit_amount=500`)
- Production and all GTM Academy resources are out of scope.

## Blocking Values And Settings

- [ ] Record the reviewed branch commit SHA: `<pending>`
- [ ] Confirm the exact branch HTTPS origin: `<pending>`
- [ ] Confirm the exact webhook URL as `<origin>/api/stripe/webhook`: `<pending>`
- [ ] Record the dedicated staging D1 database name and ID: `<pending>`
- [ ] Record the dedicated Stripe sandbox Product and Price IDs: `<pending>`
- [ ] Record the dedicated Stripe sandbox webhook endpoint ID: `<pending>`
- [ ] Confirm the dedicated Resend sender identity and credential owner: `<pending>`
- [ ] Verify in the Cloudflare dashboard that Pages Functions failure mode is **Fail closed / block requests**: `<pending>`
- [ ] Confirm the branch preview has an isolated `REVOPS_DB` binding and staging-only variables/secrets: `<pending>`
- [ ] Complete all three Cloudflare cost-warning confirmations in separate user turns: `<pending>`
- [ ] Obtain a separate explicit authorization for the final exact commands and account changes: `<pending>`

Deployment is prohibited while any item above is pending.

## Intended Configuration

Non-secret staging variables:

```text
APP_ORIGIN=<exact branch HTTPS origin>
DEPLOYMENT_ENV=staging
CHECKOUT_ENABLED=false
MANAGED_PAYMENTS_ENABLED=false
STRIPE_ENVIRONMENT=sandbox
STRIPE_PRODUCT_ID=<dedicated sandbox Product ID>
STRIPE_PRICE_ID=<dedicated EUR 5.00 sandbox Price ID>
STRIPE_PRICE_AMOUNT=500
STRIPE_PRICE_CURRENCY=eur
RESEND_FROM=<verified RevOps Pulse sender>
```

Encrypted staging secrets:

```text
STRIPE_RESTRICTED_KEY=<dedicated rk_test_ key>
STRIPE_WEBHOOK_SECRET=<dedicated sandbox endpoint secret>
RESEND_API_KEY=<dedicated RevOps Pulse key>
```

Keep `CHECKOUT_ENABLED=false` and `MANAGED_PAYMENTS_ENABLED=false` through initial deployment and verification. Enabling standard checkout or the separate session-level Managed Payments opt-in requires explicit authorization.

## Pre-Deployment Evidence

- [ ] `npm ci`
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Pages Functions bundle succeeds with the reviewed compatibility date
- [ ] `git diff --check` succeeds
- [ ] Secret and paid-content exposure scans succeed
- [ ] D1 migrations apply in filename order to both an empty local database and the prior schema
- [ ] D1 integration and concurrency tests pass in a supported local Workers runtime (macOS 13.5+ or Linux with glibc 2.35+)
- [ ] `PRAGMA integrity_check` returns `ok`
- [ ] The final branch contains no tracked `public/feed-data.json`
- [ ] Dependency audit findings are reviewed and accepted or remediated

## Authorized-Execution Gate

Before any remote command is run, the final authorization record must enumerate the exact commands with resolved IDs and values for:

1. Pushing only `feature/paid-lifetime-access` to GitHub.
2. Creating the dedicated staging D1 database, if it does not already exist.
3. Applying all unapplied files in `migrations/` in filename order to that database.
4. Adding the preview-only `REVOPS_DB` binding, variables, and encrypted secrets.
5. Setting or verifying Pages Functions failure mode as **Fail closed / block requests**.
6. Creating the dedicated Stripe sandbox Product, Price, restricted key, and webhook endpoint.
7. Creating or configuring the dedicated Resend credential and sender.
8. Triggering the branch preview deployment.

Do not use `--remote`, `pages deploy`, `deploy`, `secret put`, dashboard mutations, Cloudflare API mutations, Stripe API mutations, or Resend API mutations until that authorization is complete.

## Staging Verification

- [ ] The deployment commit equals the authorized branch SHA.
- [ ] `/login/`, `/buy/`, and `/checkout/success/` load over HTTPS.
- [ ] Unauthenticated `/` redirects to `/login/`.
- [ ] Unauthenticated `/feed-data.json` and `/api/*` return no-store authentication errors.
- [ ] A missing or failed `REVOPS_DB` binding returns `503` and never exposes the paid feed.
- [ ] Direct static access cannot bypass middleware for `/`, `/index.html`, `/index.txt`, `/__next.__PAGE__.txt`, `/__next._full.txt`, or `/feed-data.json`.
- [ ] Stripe Product and Price validation confirms sandbox mode, one-time EUR 5.00, and `livemode=false`.
- [ ] Webhook signature verification rejects tampered payloads and handles every required event idempotently.
- [ ] A successful sandbox purchase sends mailbox proof but does not authenticate from a Checkout Session ID alone.
- [ ] The magic link creates a secure session and grants the purchased account access.
- [ ] Saved items persist through the dedicated D1 database.
- [ ] Partial refunds preserve access; only full refunds restrict the affected payment grant.
- [ ] `won`, `prevented`, and `warning_closed` dispute outcomes restore that payment grant unless another active restriction remains; open or lost disputes restrict it.
- [ ] Another valid purchase preserves lifetime access.
- [ ] If separately authorized, a Managed Payments sandbox Session omits `automatic_tax`, preserves the EUR 5.00 total, produces the expected Stripe tax documents, and reconciles delayed payments, refunds, disputes, and entitlement state.
- [ ] `CHECKOUT_ENABLED` remains `false` until all checks pass and enablement is separately authorized.

## Rollback

1. Set `MANAGED_PAYMENTS_ENABLED=false`, then set `CHECKOUT_ENABLED=false` before any other rollback action.
2. Restore the prior known-good Pages deployment for the affected branch or remove the preview if it was newly created.
3. Keep the dedicated D1 database and Stripe webhook available while events and orders are reconciled.
4. Do not delete, roll back, or overwrite D1 rows as part of a code rollback.
5. Restore webhook processing before accepting another checkout.
6. Rotate dedicated Stripe or Resend secrets if exposure is suspected.
7. Invalidate affected sessions by deleting only the relevant hashed session rows.
8. Verify production `revops-pulse.pages.dev` and all GTM Academy resources remain unchanged.

## Cost Boundary

- Local preparation and Stripe sandbox test payments: expected USD/EUR 0.
- Cloudflare Pages Functions and D1 may remain within account-wide Free limits, but usage and account plan are not verified.
- Workers Paid, if required, has a documented USD 5/month account minimum.
- Resend may remain within its Free plan limits; a paid plan or excess usage is not authorized.
- No automatic plan upgrade, paid feature, production payment, or additional resource is authorized by this manifest.
