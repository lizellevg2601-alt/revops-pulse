// Pure validation only. No Stripe calls, database writes, or entitlements are created here.
export const REVOPS_LIFETIME_OFFER = Object.freeze({ product: "revops_pulse_lifetime", amount: 500, currency: "usd", mode: "payment" });

export function validateRevopsPurchaseEvent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid event payload");
  const exact=(a,b)=>a===b;
  if (input.version!==1 || input.offer!==REVOPS_LIFETIME_OFFER.product ||
      !exact(input.amount,REVOPS_LIFETIME_OFFER.amount) ||
      !exact(input.currency,REVOPS_LIFETIME_OFFER.currency) ||
      !["payment.paid","payment.refunded","payment.disputed","payment.restored"].includes(input.type)) {
    throw new Error("Unexpected purchase offer, price, currency or event type");
  }
  if (!/^evt_[a-zA-Z0-9_]{4,}$/.test(input.eventId||"") ||
      !/^pi_[a-zA-Z0-9_]{4,}$/.test(input.paymentIntentId||"") ||
      !/^cs_[a-zA-Z0-9_]{4,}$/.test(input.checkoutSessionId||"") ||
      !Number.isSafeInteger(input.occurredAt)||input.occurredAt<=0) {
    throw new Error("Invalid Stripe identifiers or event timestamp");
  }
  // Only a fresh purchase carries a buyer email (needed once, to create the member and send
  // the sign-in link). Refund/dispute/restore events identify the existing member purely by
  // paymentIntentId; they must never carry — or be trusted to supply — an email at all, per the
  // spec's requirement not to rely on webhook-supplied email for refund/dispute linking.
  // Keep this file in sync with the same-named module in the Academy repo (the sender side) -
  // they must agree on exactly this contract.
  let email = null;
  if (input.type === "payment.paid") {
    if (typeof input.email!=="string"||input.email.length>254||
       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))throw new Error("Invalid buyer email");
    email = input.email.trim().toLowerCase();
  } else if (input.email != null) {
    throw new Error("Refund, dispute and restore events must not carry a buyer email");
  }
  return {
    version:1, offer:REVOPS_LIFETIME_OFFER.product,amount:500,currency:"usd",
    eventId:input.eventId,type:input.type,paymentIntentId:input.paymentIntentId,
    checkoutSessionId:input.checkoutSessionId,email,occurredAt:input.occurredAt
  };
}
