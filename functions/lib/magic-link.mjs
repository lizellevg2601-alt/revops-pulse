import { randomToken, sha256 } from "./security.mjs";

export const GENERIC_MAGIC_LINK_RESPONSE = { message: "If that email has access, a sign-in link is on its way." };
export const MAGIC_LINK_TTL_SECONDS = 900;

export async function throttleMagicLink(db, email, nowSeconds = Math.floor(Date.now() / 1000)) {
  const throttle = await db.prepare(`
    INSERT INTO login_throttles (email, window_started_at, request_count)
    VALUES (?1, ?2, 1)
    ON CONFLICT(email) DO UPDATE SET
      window_started_at = CASE WHEN window_started_at <= ?2 - ?3 THEN ?2 ELSE window_started_at END,
      request_count = CASE WHEN window_started_at <= ?2 - ?3 THEN 1 ELSE request_count + 1 END
    RETURNING request_count
  `).bind(email, nowSeconds, MAGIC_LINK_TTL_SECONDS).first();
  return Boolean(throttle && throttle.request_count <= 3);
}

async function claimRequestKey(db, requestKey, nowSeconds) {
  if (!requestKey) return true;
  const claim = await db.prepare(`
    INSERT INTO magic_link_requests (request_key, claimed_until, updated_at)
    VALUES (?1, ?2 + ?3, ?2)
    ON CONFLICT(request_key) DO UPDATE SET
      claimed_until = excluded.claimed_until,
      current_token_hash = NULL,
      updated_at = excluded.updated_at
    WHERE magic_link_requests.claimed_until <= ?2
      AND (magic_link_requests.last_sent_at IS NULL OR magic_link_requests.last_sent_at <= ?2 - ?3)
    RETURNING request_key
  `).bind(requestKey, nowSeconds, MAGIC_LINK_TTL_SECONDS).first();
  return Boolean(claim);
}

export async function issueMagicLink({ db, env, userId, email, requestKey = null, throttled = false, nowSeconds = Math.floor(Date.now() / 1000) }) {
  if (!await claimRequestKey(db, requestKey, nowSeconds)) return false;
  if (!throttled && !await throttleMagicLink(db, email, nowSeconds)) return false;

  const token = randomToken();
  const tokenHash = await sha256(token);
  const inserted = await db.prepare(`
    INSERT INTO login_tokens (token_hash, user_id, request_key, expires_at)
    VALUES (?1, ?2, ?3, ?4 + ?5)
    RETURNING token_hash
  `).bind(tokenHash, userId, requestKey, nowSeconds, MAGIC_LINK_TTL_SECONDS).first();
  if (!inserted) return false;

  const loginUrl = `${new URL(env.APP_ORIGIN).origin}/login/#token=${encodeURIComponent(token)}`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: [email],
        subject: "Your RevOps Pulse sign-in link",
        text: `Sign in to RevOps Pulse: ${loginUrl}\n\nThis one-time link expires in 15 minutes.`,
      }),
    });
    if (response.ok) {
      if (requestKey) {
        await db.prepare(`
          UPDATE magic_link_requests
          SET last_sent_at = ?1, claimed_until = ?1 + ?2, current_token_hash = ?3, updated_at = ?1
          WHERE request_key = ?4
        `).bind(nowSeconds, MAGIC_LINK_TTL_SECONDS, tokenHash, requestKey).run();
      }
      return true;
    }
    console.error(JSON.stringify({ message: "magic_link_delivery_failed", status: response.status }));
  } catch {
    console.error(JSON.stringify({ message: "magic_link_delivery_failed", status: "network_error" }));
  }
  await db.prepare("DELETE FROM login_tokens WHERE token_hash = ?1").bind(tokenHash).run();
  if (requestKey) {
    await db.prepare(`
      UPDATE magic_link_requests SET claimed_until = ?1, updated_at = ?1
      WHERE request_key = ?2 AND current_token_hash IS NULL
    `).bind(nowSeconds, requestKey).run();
  }
  return false;
}
