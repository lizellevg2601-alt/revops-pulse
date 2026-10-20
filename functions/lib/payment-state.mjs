function qualifyingOrderSql(alias) {
  return `${alias}.status = 'paid' AND ${alias}.stripe_payment_intent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM payment_revocations rev
    WHERE rev.stripe_payment_intent_id = ${alias}.stripe_payment_intent_id
  )`;
}

export function deriveEntitlementState(orders, revokedPaymentIntents) {
  const qualifying = orders.filter((order) => order.status === "paid" && !revokedPaymentIntents.has(order.paymentIntentId));
  if (qualifying.length > 0) return { active: true, sourceOrderId: qualifying.at(-1).id };
  return { active: false, sourceOrderId: orders.at(-1)?.id || null };
}

export function fulfillmentStatements(db, payment) {
  const revokedStatus = `CASE (SELECT reason FROM payment_revocations WHERE stripe_payment_intent_id = ?9)
    WHEN 'dispute' THEN 'disputed' WHEN 'refund' THEN 'refunded' ELSE 'paid' END`;
  return [
    db.prepare(`
      INSERT INTO stripe_charge_map (stripe_charge_id, stripe_payment_intent_id) VALUES (?1, ?2)
      ON CONFLICT(stripe_charge_id) DO UPDATE SET stripe_payment_intent_id = excluded.stripe_payment_intent_id
    `).bind(payment.chargeId, payment.paymentIntentId),
    db.prepare(`
      INSERT INTO orders (id, checkout_attempt_id, user_id, stripe_session_id, stripe_payment_intent_id, stripe_charge_id, amount, currency, status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ${revokedStatus})
      ON CONFLICT(stripe_session_id) DO UPDATE SET
        stripe_payment_intent_id = excluded.stripe_payment_intent_id,
        stripe_charge_id = excluded.stripe_charge_id,
        status = ${revokedStatus},
        updated_at = unixepoch()
    `).bind(payment.orderId, payment.attemptId, payment.userId, payment.sessionId, payment.paymentIntentId, payment.chargeId, payment.amount, payment.currency, payment.paymentIntentId),
    db.prepare(`
      UPDATE checkout_attempts
      SET status = (SELECT status FROM orders WHERE stripe_session_id = ?1), updated_at = unixepoch()
      WHERE id = ?2
    `).bind(payment.sessionId, payment.attemptId),
    reconcileKnownUserStatement(db, payment.userId),
  ];
}

export function revocationStatements(db, revocation) {
  return [
    db.prepare(`
      INSERT INTO stripe_charge_map (stripe_charge_id, stripe_payment_intent_id) VALUES (?1, ?2)
      ON CONFLICT(stripe_charge_id) DO UPDATE SET stripe_payment_intent_id = excluded.stripe_payment_intent_id
    `).bind(revocation.chargeId, revocation.paymentIntentId),
    db.prepare(`
      INSERT INTO payment_revocations (stripe_payment_intent_id, stripe_charge_id, reason, stripe_event_id)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(stripe_payment_intent_id) DO UPDATE SET
        stripe_charge_id = COALESCE(excluded.stripe_charge_id, payment_revocations.stripe_charge_id),
        reason = CASE WHEN payment_revocations.reason = 'dispute' OR excluded.reason = 'dispute' THEN 'dispute' ELSE 'refund' END,
        stripe_event_id = excluded.stripe_event_id,
        updated_at = unixepoch()
    `).bind(revocation.paymentIntentId, revocation.chargeId, revocation.reason, revocation.eventId),
    db.prepare(`
      UPDATE orders SET
        status = CASE (SELECT reason FROM payment_revocations WHERE stripe_payment_intent_id = ?1)
          WHEN 'dispute' THEN 'disputed' ELSE 'refunded' END,
        updated_at = unixepoch()
      WHERE stripe_payment_intent_id = ?1 OR stripe_charge_id = ?2
    `).bind(revocation.paymentIntentId, revocation.chargeId),
    reconcileAffectedUsersStatement(db, revocation),
  ];
}

export function asyncPaymentFailureStatements(db, sessionId) {
  return [db.prepare(`
    UPDATE checkout_attempts
    SET status = 'failed', updated_at = unixepoch()
    WHERE stripe_session_id = ?1 AND status IN ('created', 'checkout_open')
  `).bind(sessionId)];
}

function reconcileKnownUserStatement(db, userId) {
  const qualifying = qualifyingOrderSql("candidate");
  return db.prepare(`
    INSERT INTO lifetime_entitlements (user_id, source_order_id, status, revoked_at, revoke_reason)
    SELECT ?1, candidate.id,
      CASE WHEN ${qualifying} THEN 'active' ELSE 'revoked' END,
      CASE WHEN ${qualifying} THEN NULL ELSE unixepoch() END,
      CASE WHEN ${qualifying} THEN NULL WHEN candidate.status = 'disputed' THEN 'dispute' ELSE 'refund' END
    FROM orders candidate
    WHERE candidate.user_id = ?1
    ORDER BY CASE WHEN ${qualifying} THEN 0 ELSE 1 END, candidate.created_at DESC, candidate.id DESC
    LIMIT 1
    ON CONFLICT(user_id) DO UPDATE SET
      source_order_id = excluded.source_order_id,
      status = excluded.status,
      revoked_at = excluded.revoked_at,
      revoke_reason = excluded.revoke_reason
  `).bind(userId);
}

function reconcileAffectedUsersStatement(db, revocation) {
  const qualifying = qualifyingOrderSql("eligible");
  return db.prepare(`
    UPDATE lifetime_entitlements AS entitlement
    SET source_order_id = (
        SELECT preferred.id FROM orders preferred
        WHERE preferred.user_id = entitlement.user_id
        ORDER BY CASE WHEN ${qualifyingOrderSql("preferred")} THEN 0 ELSE 1 END,
          preferred.created_at DESC, preferred.id DESC
        LIMIT 1
      ),
      status = CASE WHEN EXISTS (
        SELECT 1 FROM orders eligible
        WHERE eligible.user_id = entitlement.user_id AND ${qualifying}
      ) THEN 'active' ELSE 'revoked' END,
      revoked_at = CASE WHEN EXISTS (
        SELECT 1 FROM orders eligible
        WHERE eligible.user_id = entitlement.user_id AND ${qualifying}
      ) THEN NULL ELSE unixepoch() END,
      revoke_reason = CASE WHEN EXISTS (
        SELECT 1 FROM orders eligible
        WHERE eligible.user_id = entitlement.user_id AND ${qualifying}
      ) THEN NULL ELSE COALESCE((
        SELECT rev.reason
        FROM orders revoked_order
        JOIN payment_revocations rev ON rev.stripe_payment_intent_id = revoked_order.stripe_payment_intent_id
        WHERE revoked_order.user_id = entitlement.user_id
        ORDER BY CASE rev.reason WHEN 'dispute' THEN 0 ELSE 1 END, revoked_order.created_at DESC
        LIMIT 1
      ), ?1) END
    WHERE entitlement.user_id IN (
      SELECT user_id FROM orders WHERE stripe_payment_intent_id = ?2 OR stripe_charge_id = ?3
    )
  `).bind(revocation.reason, revocation.paymentIntentId, revocation.chargeId);
}

export async function applyStripeTransition(db, event, statements, status = "processed") {
  await db.batch([
    db.prepare(`
      INSERT INTO stripe_events (event_id, event_type, status)
      VALUES (?1, ?2, 'processing')
      ON CONFLICT(event_id) DO NOTHING
    `).bind(event.id, event.type),
    ...statements,
    db.prepare(`
      UPDATE stripe_events SET status = ?1, processed_at = unixepoch(), error_code = NULL
      WHERE event_id = ?2
    `).bind(status, event.id),
  ]);
}
