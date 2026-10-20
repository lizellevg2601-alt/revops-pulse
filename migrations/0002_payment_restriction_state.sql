CREATE TABLE payment_restrictions_v2 (
  stripe_payment_intent_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('refund', 'dispute')),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  stripe_event_id TEXT NOT NULL,
  stripe_event_created INTEGER NOT NULL,
  stripe_state_rank INTEGER NOT NULL CHECK (stripe_state_rank > 0),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (stripe_payment_intent_id, reason)
) STRICT;

INSERT INTO payment_restrictions_v2 (
  stripe_payment_intent_id,
  stripe_charge_id,
  reason,
  active,
  stripe_event_id,
  stripe_event_created,
  stripe_state_rank,
  created_at,
  updated_at
)
SELECT
  stripe_payment_intent_id,
  stripe_charge_id,
  reason,
  1,
  stripe_event_id,
  0,
  CASE reason WHEN 'refund' THEN 2 ELSE 1 END,
  created_at,
  updated_at
FROM payment_revocations;

DROP TABLE payment_revocations;
ALTER TABLE payment_restrictions_v2 RENAME TO payment_revocations;
CREATE INDEX payment_revocations_charge ON payment_revocations(stripe_charge_id);
