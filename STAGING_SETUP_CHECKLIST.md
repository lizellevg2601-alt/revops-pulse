# RevOps Pulse Staging Setup

This checklist prepares the standalone RevOps Pulse staging environment. It does not authorize resource creation or deployment, and no GTM Academy production or staging resource may be reused or changed.

## 1. GitHub Access

- Repository owner `lizellevg2601-alt` grants `gtmautomationacademy` **Write** access to `lizellevg2601-alt/revops-pulse`.
- Push only `feature/paid-lifetime-access`; do not push directly to `main`.
- Open a reviewed pull request into `main`. Require partner approval and passing tests/build before merge.
- Recommended repository hardening: protect `main`, require pull requests/checks, and pin GitHub Actions to reviewed immutable revisions.

## 2. Stripe Sandbox

- Use the existing GTM Academy Stripe business account, but create a separate general sandbox for RevOps Pulse.
- Create Product `RevOps Pulse`; do not reuse an Assessment Product.
- Create a one-time Price for **EUR 5.00** (`unit_amount=500`, `currency=eur`, `type=one_time`). No subscription, recurring Price, bundle, automatic tax, or post-payment invoice.
- Record the new sandbox `prod_...` and `price_...` IDs as staging variables only.
- Keep Stripe Managed Payments **Enable by default** off. Confirm the RevOps Pulse Product is still eligible and its SaaS tax category is approved before setting the session-level `MANAGED_PAYMENTS_ENABLED=true` gate.
- Create a dedicated restricted sandbox key with only Product read, Price read, Checkout Sessions write (including read), Payment Intent read, Charge read, and Dispute read permissions.
- Register the staging webhook at `https://<staging-origin>/api/stripe/webhook` for the events listed in `README.md` and store its dedicated signing secret.
- Future price changes require a new Stripe Price and coordinated updates to `STRIPE_PRICE_ID`, `STRIPE_PRICE_AMOUNT`, and `STRIPE_PRICE_CURRENCY`. Existing orders and lifetime entitlements remain unchanged.

## 3. Dedicated Cloudflare D1

- In the partner-owned Cloudflare account `c3974c9f555d3c107ece3f4f48defb23`, create a staging-only D1 database such as `revops-pulse-staging`.
- Do not bind the Academy orders, analytics, signup, assessment, or personalised-content databases.
- Apply every file in `migrations/` once, in filename order, and verify `PRAGMA integrity_check` before deployment.
- Run the D1 integration tests against a supported local Workers runtime before deployment; this host's macOS 12.6 cannot start current `workerd`, which requires macOS 13.5 or newer.
- Bind it to the Pages staging/preview environment with the exact binding name `REVOPS_DB`.

## 4. Resend

- Use a verified sender domain/identity approved for RevOps Pulse transactional authentication email.
- Create a dedicated least-privilege RevOps Pulse API key; do not reuse or expose an Academy key.
- Set `RESEND_FROM` to the verified sender and store `RESEND_API_KEY` only as an encrypted Pages secret.
- Confirm magic-link delivery, bounce handling, suppression behavior, and support ownership in staging.

## 5. Cloudflare Pages Functions

- Partner Pages project: `revops-pulse`; build command `npm run build`; output directory `out`; root directory repository root.
- Keep Pages Functions in `functions/` and configure Functions to **fail closed** so authentication failures cannot expose static paid content.
- Configure staging variables:
  - `APP_ORIGIN=https://<exact-staging-origin>`
  - `DEPLOYMENT_ENV=staging`
  - `CHECKOUT_ENABLED=true` only after all checks pass
  - `MANAGED_PAYMENTS_ENABLED=false` until its separate sandbox checklist passes
  - `STRIPE_ENVIRONMENT=sandbox`
  - `STRIPE_PRODUCT_ID=<dedicated sandbox Product ID>`
  - `STRIPE_PRICE_ID=<EUR 5.00 sandbox Price ID>`
  - `STRIPE_PRICE_AMOUNT=500`
  - `STRIPE_PRICE_CURRENCY=eur`
  - `RESEND_FROM=<verified sender>`
- Configure encrypted staging secrets:
  - `STRIPE_RESTRICTED_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `RESEND_API_KEY`
- Keep `CHECKOUT_ENABLED=false` until D1 migration, webhook verification, email delivery, direct-access rejection, and rollback checks pass.
- Before a Managed Payments sandbox trial, verify a paid and delayed-payment flow, Stripe-issued invoice/receipt and any credit note, full and partial refund behavior, dispute behavior, webhook idempotency, and entitlement revocation/restoration. Roll back by setting `MANAGED_PAYMENTS_ENABLED=false`; disable all Checkout if reconciliation is uncertain.
- Verify direct requests to `/index.html`, `/index.txt`, `/__next.__PAGE__.txt`, and `/__next._full.txt` cannot bypass authentication.
- Add Turnstile to public login and checkout before production under a separately approved Cloudflare change.

## 6. Estimated Ongoing Costs

- Current RSS ingestion and application AI cost: **EUR/USD 0**; no AI provider is called.
- Stripe sandbox: **0**; test payments do not move money or incur processing fees.
- Production Stripe, indicative Portugal standard pricing only: EEA cards are publicly listed at 1.5% + EUR 0.25, approximately EUR 0.33 on a EUR 5.00 purchase. The actual GTM Academy contract, card origin, disputes, currency conversion, tax, and optional services can change this.
- Managed Payments, if separately approved for production, has account-, country-, payment-method-, and contract-dependent fees. Confirm the current fee schedule shown for the actual account before live approval.
- Cloudflare Pages Functions and D1: potentially **USD 0** at low volume within account-wide Free limits. Workers Paid, if required, has a **USD 5/month account minimum**; shared account usage determines actual headroom and overages.
- Resend: **USD 0/month** up to 3,000 transactional emails/month and 100/day on the published Free plan; Pro starts at **USD 20/month**.
- Turnstile: **USD 0** under its standard free offering. No Turnstile resource is authorized yet.

## 7. Required Authorizations

- Partner approval to grant GitHub Write access and review the pull request.
- Explicit approval before creating the Stripe sandbox, Product, Price, restricted key, or webhook endpoint.
- Cloudflare cost warnings 1, 2, and 3 completed in separate user turns before creating D1, changing Pages bindings/settings/secrets, or deploying.
- Explicit approval before creating or changing Resend credentials or sender configuration.
- Separate staging deployment authorization after the exact resource, cost, command, verification, and rollback manifest is reviewed.
- Separate production authorization after staging acceptance. This checklist grants no production access or deployment authority.
