PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE checkout_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  expected_price_id TEXT NOT NULL,
  expected_product_id TEXT NOT NULL,
  expected_amount INTEGER NOT NULL CHECK (expected_amount > 0),
  expected_currency TEXT NOT NULL CHECK (length(expected_currency) = 3),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'checkout_open', 'paid', 'failed', 'refunded', 'disputed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  checkout_attempt_id TEXT NOT NULL UNIQUE REFERENCES checkout_attempts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT UNIQUE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  status TEXT NOT NULL CHECK (status IN ('paid', 'refunded', 'disputed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE stripe_charge_map (
  stripe_charge_id TEXT PRIMARY KEY,
  stripe_payment_intent_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE payment_revocations (
  stripe_payment_intent_id TEXT PRIMARY KEY,
  stripe_charge_id TEXT UNIQUE,
  reason TEXT NOT NULL CHECK (reason IN ('refund', 'dispute')),
  stripe_event_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE lifetime_entitlements (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  source_order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  granted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  revoked_at INTEGER,
  revoke_reason TEXT CHECK (revoke_reason IN ('refund', 'dispute') OR revoke_reason IS NULL)
) STRICT;

CREATE TABLE stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'processed', 'ignored', 'failed')),
  received_at INTEGER NOT NULL DEFAULT (unixepoch()),
  processed_at INTEGER,
  error_code TEXT
) STRICT;

CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_key TEXT,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE magic_link_requests (
  request_key TEXT PRIMARY KEY,
  claimed_until INTEGER NOT NULL,
  last_sent_at INTEGER,
  current_token_hash TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE login_throttles (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count >= 0)
) STRICT;

CREATE TABLE request_throttles (
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL CHECK (length(key_hash) = 64),
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count >= 0),
  PRIMARY KEY (scope, key_hash)
) STRICT;

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_json TEXT NOT NULL CHECK (json_valid(profile_json)),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE saved_items (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL CHECK (length(item_id) BETWEEN 1 AND 128),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, item_id)
) STRICT;

CREATE INDEX sessions_user_expiry ON sessions(user_id, expires_at);
CREATE INDEX login_tokens_user_expiry ON login_tokens(user_id, expires_at);
CREATE INDEX login_tokens_request_key ON login_tokens(request_key, expires_at);
CREATE INDEX request_throttles_window ON request_throttles(window_started_at);
CREATE INDEX checkout_attempts_user ON checkout_attempts(user_id, created_at);
CREATE INDEX orders_user_status ON orders(user_id, status);
CREATE INDEX orders_payment_lookup ON orders(stripe_payment_intent_id, stripe_charge_id);
CREATE INDEX stripe_charge_map_payment_intent ON stripe_charge_map(stripe_payment_intent_id);
CREATE INDEX saved_items_user ON saved_items(user_id, created_at);
