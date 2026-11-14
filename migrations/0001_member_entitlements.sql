-- Staging-only membership schema. Apply only after explicit Cloudflare approval.
CREATE TABLE IF NOT EXISTS member_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS member_payment_events (
  event_id TEXT PRIMARY KEY,
  payment_intent_id TEXT NOT NULL,
  checkout_session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS member_payment_grants (
  payment_intent_id TEXT PRIMARY KEY,
  checkout_session_id TEXT NOT NULL,
  member_id TEXT NOT NULL REFERENCES member_accounts(id),
  last_event_at INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('active','refunded','disputed')),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_member_payment_grants_member ON member_payment_grants(member_id);
