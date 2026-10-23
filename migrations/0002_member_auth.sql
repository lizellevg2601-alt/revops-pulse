-- Passwordless membership tables; RevOps D1 only, not deployed.
CREATE TABLE IF NOT EXISTS member_sessions (
 token_hash TEXT PRIMARY KEY,
 member_id TEXT NOT NULL REFERENCES member_accounts(id),
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_member_sessions_exp ON member_sessions(expires_at);
CREATE TABLE IF NOT EXISTS member_login_tokens (
 token_hash TEXT PRIMARY KEY,
 member_id TEXT NOT NULL REFERENCES member_accounts(id),
 expires_at INTEGER NOT NULL,
 consumed_at INTEGER
);
CREATE TABLE IF NOT EXISTS member_login_rate (
 email TEXT PRIMARY KEY,
 window_start INTEGER NOT NULL,
 count INTEGER NOT NULL
);
