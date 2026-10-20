function qualifyingOrderSql(alias) {
  return `${alias}.status = 'paid' AND ${alias}.stripe_payment_intent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM payment_revocations rev
    WHERE rev.stripe_payment_intent_id = ${alias}.stripe_payment_intent_id AND rev.active = 1
  )`;
}

function orderStatusSql(paymentIntentExpression) {
  return `CASE
    WHEN EXISTS (SELECT 1 FROM payment_revocations WHERE stripe_payment_intent_id = ${paymentIntentExpression} AND reason = 'dispute' AND active = 1) THEN 'disputed'
    WHEN EXISTS (SELECT 1 FROM payment_revocations WHERE stripe_payment_intent_id = ${paymentIntentExpression} AND reason = 'refund' AND active = 1) THEN 'refunded'
    ELSE 'paid' END`;
}

export function deriveEntitlementState(orders, revokedPaymentIntents) {
  const qualifying = orders.filter((order) => order.status === "paid" && !revokedPaymentIntents.has(order.paymentIntentId));
  if (qualifying.length > 0) return { active: true, sourceOrderId: qualifying.at(-1).id };
  return { active: false, sourceOrderId: orders.at(-1)?.id || null };
}

export function fulfillmentStatements(db, payment) {
  const currentStatus = orderStatusSql("?9");
  return [
    db.prepare(`
      INSERT INTO stripe_charge_map (stripe_charge_id, stripe_payment_intent_id)
      SELECT ?1, ?2 WHERE NOT EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ?3)
      ON CONFLICT(stripe_charge_id) DO UPDATE SET stripe_payment_intent_id = excluded.stripe_payment_intent_id
    `).bind(payment.chargeId, payment.paymentIntentId, payment.eventId),
    db.prepare(`
      INSERT INTO orders (id, checkout_attempt_id, user_id, stripe_session_id, stripe_payment_intent_id, stripe_charge_id, amount, currency, status)
      SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ${currentStatus}
      WHERE NOT EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ?10)
      ON CONFLICT(stripe_session_id) DO UPDATE SET
        stripe_payment_intent_id = excluded.stripe_payment_intent_id,
        stripe_charge_id = excluded.stripe_charge_id,
        status = ${currentStatus},
        updated_at = unixepoch()
    `).bind(payment.orderId, payment.attemptId, payment.userId, payment.sessionId, payment.paymentIntentId, payment.chargeId, payment.amount, payment.currency, payment.paymentIntentId, payment.eventId),
    db.prepare(`
      UPDATE checkout_attempts
      SET status = (SELECT status FROM orders WHERE stripe_session_id = ?1), updated_at = unixepoch()
      WHERE id = ?2 AND NOT EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ?3)
    `).bind(payment.sessionId, payment.attemptId, payment.eventId),
    reconcileKnownUserStatement(db, payment.userId, payment.eventId),
  ];
}

export function paymentRestrictionStatements(db, restriction) {
  return [
    db.prepare(`
      INSERT INTO stripe_charge_map (stripe_charge_id, stripe_payment_intent_id)
      SELECT ?1, ?2 WHERE NOT EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ?3)
      ON CONFLICT(stripe_charge_id) DO UPDATE SET stripe_payment_intent_id = excluded.stripe_payment_intent_id
    `).bind(restriction.chargeId, restriction.paymentIntentId, restriction.eventId),
    db.prepare(`
      INSERT INTO payment_revocations (stripe_payment_intent_id, stripe_charge_id, reason, active, stripe_event_id, stripe_event_created, stripe_state_rank)
      SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
      WHERE NOT EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ?5)
      ON CONFLICT(stripe_payment_intent_id, reason) DO UPDATE SET
        stripe_charge_id = COALESCE(excluded.stripe_charge_id, payment_revocations.stripe_charge_id),
        active = excluded.active,
        stripe_event_id = excluded.stripe_event_id,
        stripe_event_created = excluded.stripe_event_created,
        stripe_state_rank = excluded.stripe_state_rank,
        updated_at = unixepoch()
      WHERE excluded.stripe_event_created > payment_revocations.stripe_event_created
        OR (excluded.stripe_event_created = payment_revocations.stripe_event_created
          AND excluded.stripe_state_rank >= payment_revocations.stripe_state_rank)
    `).bind(restriction.paymentIntentId, restriction.chargeId, restriction.reason, restriction.active ? 1 : 0, restriction.eventId, restriction.eventCreated, restriction.stateRank),
    db.prepare(`
      UPDATE orders SET
        status = ${orderStatusSql("stripe_payment_intent_id")},
        updated_at = unixepoch()
      WHERE (stripe_payment_intent_id = ?1 OR stripe_charge_id = ?2)
        AND NOT EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ?3)
    `).bind(restriction.paymentIntentId, restriction.chargeId, restriction.eventId),
    db.prepare(`
      UPDATE checkout_attempts
      SET status = (SELECT status FROM orders WHERE orders.checkout_attempt_id = checkout_attempts.id), updated_at = unixepoch()
      WHERE id IN (SELECT checkout_attempt_id FROM orders WHERE stripe_payment_intent_id = ?1 OR stripe_charge_id = ?2)
        AND NOT EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ?3)
    `).bind(restriction.paymentIntentId, restriction.chargeId, restriction.eventId),
    reconcileAffectedUsersStatement(db, restriction),
  ];
}

export function asyncPaymentFailureStatements(db, sessionId, eventId) {
  return [db.prepare(`
    UPDATE checkout_attempts
    SET status = 'failed', updated_at = unixepoch()
    WHERE stripe_session_id = ?1 AND status IN ('created', 'checkout_open')
      AND NOT EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ?2)
  `).bind(sessionId, eventId)];
}

function reconcileKnownUserStatement(db, userId, eventId) {
  const qualifying = qualifyingOrderSql("candidate");
  return db.prepare(`
    INSERT INTO lifetime_entitlements (user_id, source_order_id, status, revoked_at, revoke_reason)
    SELECT ?1, candidate.id,
      CASE WHEN ${qualifying} THEN 'active' ELSE 'revoked' END,
      CASE WHEN ${qualifying} THEN NULL ELSE unixepoch() END,
      CASE WHEN ${qualifying} THEN NULL WHEN candidate.status = 'disputed' THEN 'dispute' ELSE 'refund' END
    FROM orders candidate
    WHERE candidate.user_id = ?1 AND NOT EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ?2)
    ORDER BY CASE WHEN ${qualifying} THEN 0 ELSE 1 END, candidate.created_at DESC, candidate.id DESC
    LIMIT 1
    ON CONFLICT(user_id) DO UPDATE SET
      source_order_id = excluded.source_order_id,
      status = excluded.status,
      revoked_at = excluded.revoked_at,
      revoke_reason = excluded.revoke_reason
  `).bind(userId, eventId);
}

function reconcileAffectedUsersStatement(db, restriction) {
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
      ) THEN NULL ELSE COALESCE(entitlement.revoked_at, unixepoch()) END,
      revoke_reason = CASE WHEN EXISTS (
        SELECT 1 FROM orders eligible
        WHERE eligible.user_id = entitlement.user_id AND ${qualifying}
      ) THEN NULL ELSE COALESCE((
        SELECT rev.reason
        FROM orders revoked_order
        JOIN payment_revocations rev ON rev.stripe_payment_intent_id = revoked_order.stripe_payment_intent_id
        WHERE revoked_order.user_id = entitlement.user_id AND rev.active = 1
        ORDER BY CASE rev.reason WHEN 'dispute' THEN 0 ELSE 1 END, revoked_order.created_at DESC
        LIMIT 1
      ), ?1) END
    WHERE entitlement.user_id IN (
      SELECT user_id FROM orders WHERE stripe_payment_intent_id = ?2 OR stripe_charge_id = ?3
    )
      AND NOT EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ?4)
  `).bind(restriction.reason, restriction.paymentIntentId, restriction.chargeId, restriction.eventId);
}

export async function applyStripeTransition(db, event, statements, status = "processed") {
  await db.batch([
    ...statements,
    db.prepare(`
      INSERT INTO stripe_events (event_id, event_type, status, processed_at)
      VALUES (?1, ?2, ?3, unixepoch())
      ON CONFLICT(event_id) DO NOTHING
    `).bind(event.id, event.type, status),
  ]);
}
