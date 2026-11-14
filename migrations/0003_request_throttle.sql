-- Per-IP rate limiting, independent of the existing per-email limiter in member_login_rate:
-- that one only catches many requests for the SAME email, not one IP hammering many different
-- emails. RevOps D1 only, not deployed.
CREATE TABLE IF NOT EXISTS request_throttles (
 scope TEXT NOT NULL,
 key_hash TEXT NOT NULL,
 window_started_at INTEGER NOT NULL,
 request_count INTEGER NOT NULL,
 PRIMARY KEY (scope, key_hash)
);
