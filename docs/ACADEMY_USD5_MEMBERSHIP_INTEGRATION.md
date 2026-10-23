# RevOps Pulse — US$5 lifetime access integration

STATUS: DEVELOPMENT ONLY. Do not deploy or configure Stripe from this document.

## Responsibility split
- GTM Academy owns the sole customer-facing checkout, the dedicated RevOps Pulse Stripe Product/Price, payment webhooks, and payment support.
- RevOps Pulse owns its own D1 lifetime entitlements, passwordless login, paid content, and member support.
- Price: one-time USD 5.00 = 500 cents, no subscription. Existing EUR test prices are not valid for this offer.
- Retain the Academy's existing Stripe account and preserve other Academy product checkout flows.

## Secure event contract to implement
1. Academy server creates a Stripe Checkout Session using a server-configured dedicated USD 500 Price and immutable purchase identifier.
2. Verified, signed Stripe webhook is authoritative for paid status; customer redirect alone never grants access.
3. Academy backend sends a server-authenticated, versioned event with minimum necessary payer email, Stripe payment identifiers, offer id, amount/currency, event id/type and timestamp.
4. RevOps checks authentication, offer validity, amount/currency, idempotency, environment and event ordering, then updates dedicated D1 and sends a secure one-time sign-in email.
5. Verified refunds/disputes update the associated payment grant. A second valid payment can maintain the account entitlement.
6. Browser traffic must never call a cross-origin RevOps checkout API, and no client supplied email/session ID constitutes proof of purchase.

## Dependencies and deployment gates
- Academy main currently lacks its payment Worker; existing payments-worker.js is on draft-refresh-2026-10-22. Port only the relevant current payment implementation, not unrelated product changes.
- Partner RevOps code is on feature/paid-lifetime-access and is based on an older RevOps main; adapt its D1, authentication, webhook and middleware selectively while retaining editorial V2.
- Explicitly protect /approved-intelligence.json and /feed-data.json, dashboard HTML, alternate static-export URLs, and any premium media. Audit fail-closed behavior.
- New staging-only dedicated RevOps D1 binding, transactional mail configuration and sandbox USD Price require separate owner approval.
- Before any merge/deployment: integration tests for duplicate/out-of-order events, payment retry, $5/USD check, refunds/disputes, login, direct asset access, and existing Academy purchases.

## Preservation
Do not merge or delete older development branches until all code to be reused is migrated, reviewed, and tested. Do not modify live Cloudflare or Stripe configuration.
