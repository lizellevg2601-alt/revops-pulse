import Stripe from "stripe";
import { HttpError } from "./http.mjs";

export const STRIPE_API_VERSION = "2026-08-26.dahlia";

export function stripeClient(env) {
  if (typeof env.STRIPE_RESTRICTED_KEY !== "string" || !env.STRIPE_RESTRICTED_KEY.startsWith("rk_test_")) {
    throw new HttpError(503, "checkout_disabled", "Checkout is not configured");
  }
  return new Stripe(env.STRIPE_RESTRICTED_KEY, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function checkoutConfig(env) {
  const amount = Number(env.STRIPE_PRICE_AMOUNT);
  const currency = String(env.STRIPE_PRICE_CURRENCY || "").toLowerCase();
  if (
    env.CHECKOUT_ENABLED !== "true" ||
    env.DEPLOYMENT_ENV !== "staging" ||
    env.STRIPE_ENVIRONMENT !== "sandbox" ||
    !env.STRIPE_PRICE_ID ||
    !env.STRIPE_PRODUCT_ID ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !/^[a-z]{3}$/.test(currency)
  ) throw new HttpError(503, "checkout_disabled", "Checkout is not configured");
  return { amount, currency, priceId: env.STRIPE_PRICE_ID, productId: env.STRIPE_PRODUCT_ID };
}

export function productId(price) {
  return typeof price.product === "string" ? price.product : price.product?.id;
}

export function validatePrice(price, config) {
  return price && price.livemode === false && price.active === true && price.type === "one_time" &&
    price.id === config.priceId && productId(price) === config.productId &&
    price.currency === config.currency && price.unit_amount === config.amount;
}

export async function verifyStripeEvent(stripe, rawBody, signature, secret) {
  if (!signature || !secret) throw new HttpError(400, "invalid_signature", "Invalid webhook signature");
  try {
    return await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    throw new HttpError(400, "invalid_signature", "Invalid webhook signature");
  }
}
