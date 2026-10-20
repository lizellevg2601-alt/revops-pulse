export const SESSION_COOKIE = "revops_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return btoa(String.fromCharCode(...value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function randomLowercase(length = 8) {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => String.fromCharCode(97 + (value % 26))).join("");
}

export function parseCookies(header) {
  const cookies = new Map();
  for (const part of (header || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    cookies.set(part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim()));
  }
  return cookies;
}

export function sessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function getSession(request, db) {
  const token = parseCookies(request.headers.get("Cookie")).get(SESSION_COOKIE);
  if (!token || token.length > 128) return null;
  const tokenHash = await sha256(token);
  return db.prepare(`
    SELECT users.id, users.email
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    JOIN lifetime_entitlements ON lifetime_entitlements.user_id = users.id
    WHERE sessions.token_hash = ?1
      AND sessions.expires_at > unixepoch()
      AND lifetime_entitlements.status = 'active'
    LIMIT 1
  `).bind(tokenHash).first();
}

export async function createSession(db, userId) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  await db.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (?1, ?2, unixepoch() + ?3)
  `).bind(tokenHash, userId, SESSION_TTL_SECONDS).run();
  return token;
}

export async function consumeLoginToken(db, rawToken) {
  if (typeof rawToken !== "string" || rawToken.length < 32 || rawToken.length > 128) return null;
  const tokenHash = await sha256(rawToken);
  return db.prepare(`
    UPDATE login_tokens
    SET consumed_at = unixepoch()
    WHERE token_hash = ?1 AND consumed_at IS NULL AND expires_at > unixepoch()
    RETURNING user_id
  `).bind(tokenHash).first();
}
