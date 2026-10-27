# RevOps Pulse — launch experience & editorial audit

Status: Audit and copy-only changes, NOT deployment approval.

## Confirmed from current main
- Current approved-intelligence collection is `[]`. No original reviewed articles have been published.
- Home currently leads with a "Your GTM and RevOps news" hero, category tiles, and an RSS-derived latest-intelligence feed.
- Human-reviewed intelligence section already exists; its empty state appears before syndicated updates.
- Bookmarks are stored in localStorage, not synchronized between browsers.
- Initial membership/paywall changes live in separate Draft PR #14; Academy payment work lives in Draft PR #16.
- Membership preview CI and Cloudflare checks passed on PR #14; this does not prove complete payment/refund or production security.
- Current public editorial homepage is not a content-rich paid publication yet.

## Launch blockers (must verify or resolve)
1. Complete security acceptance: anonymous direct URL attempts for all premium JSON and Next export representations; fail-closed middleware/D1 behavior; refund/dispute/recovery tests.
2. Verify purchase -> member entitlement -> email -> repeat login -> premium reading, with real staging services and evidence.
3. Publish a minimum useful launch collection of genuinely original, verified, human-approved intelligence before promising reviewed perspectives. Five substantive articles is a suggested editorial target, not a technical limit.
4. Source verification and rights: verify source URLs/claims and permissions, avoid unlicensed publisher visuals, and separate syndicated headlines from authored analysis.
5. Confirm the Academy’s sole USD $5 checkout, legal terms, support, tax, production key/webhook/bindings through owner-approved launch process.

## Experience improvements
- Label monitored news as external-source updates, never as editor-approved original reporting.
- Prioritize original editor-approved insights once substantive content exists.
- Ensure member-facing help, login recovery, payment acknowledgement and access-return flow are easy to follow.
- Test on small-screen, tablet and desktop; check nav/filter/bookmark feedback, broken images/links, empty/loading/error states and accessibility.
- Define owner runbook for RSS failure, AI draft job, manual approval, email delivery, entitlement retry/dead-letter, refunds and customer support.

## Release separation
- This branch is copy and audit only. Keep PR #14/#16 Draft until full technical staging tests pass.
- Do not merge old payment branches, delete branches, change secrets, switch paywall, or enable Stripe in this audit.
