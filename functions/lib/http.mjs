const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Content-Type": "application/json; charset=utf-8",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}

export function error(code, message, status = 400) {
  return json({ error: { code, message } }, status);
}

export function methodNotAllowed(allowed) {
  return json({ error: { code: "method_not_allowed", message: "Method not allowed" } }, 405, { Allow: allowed.join(", ") });
}

export async function readJson(request, maxBytes = 16_384) {
  const contentType = request.headers.get("Content-Type") || "";
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (!contentType.toLowerCase().startsWith("application/json")) throw new HttpError(415, "content_type", "Expected application/json");
  if (declaredLength > maxBytes) throw new HttpError(413, "body_too_large", "Request body is too large");
  const body = await readBoundedText(request, maxBytes);
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "invalid_json", "Invalid JSON body");
  }
}

export async function readBoundedText(request, maxBytes) {
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > maxBytes) throw new HttpError(413, "body_too_large", "Request body is too large");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "body_too_large", "Request body is too large");
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

export function requireSameOrigin(request, env) {
  let configured;
  try {
    configured = new URL(env.APP_ORIGIN);
  } catch {
    throw new HttpError(503, "configuration_error", "Application origin is not configured");
  }
  const origin = request.headers.get("Origin");
  if (!origin || origin !== configured.origin || configured.pathname !== "/") {
    throw new HttpError(403, "invalid_origin", "Request origin is not allowed");
  }
  return configured.origin;
}

// Like requireSameOrigin, but additionally accepts requests from a small, explicit
// allowlist of partner origins (configured via CHECKOUT_ALLOWED_ORIGINS) that are
// permitted to start a Checkout Session on this app's behalf — e.g. the GTM
// Automation Academy homepage, which hosts a "buy" entry point for this product.
// success_url/cancel_url always resolve against this app's own APP_ORIGIN
// regardless of which allowed origin made the request.
export function requireAllowedCheckoutOrigin(request, env) {
  let configured;
  try {
    configured = new URL(env.APP_ORIGIN);
  } catch {
    throw new HttpError(503, "configuration_error", "Application origin is not configured");
  }
  if (configured.pathname !== "/") throw new HttpError(503, "configuration_error", "Application origin is not configured");
  const extra = String(env.CHECKOUT_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean);
  const allowed = new Set([configured.origin, ...extra]);
  const origin = request.headers.get("Origin");
  if (!origin || !allowed.has(origin)) throw new HttpError(403, "invalid_origin", "Request origin is not allowed");
  return { requestOrigin: origin, appOrigin: configured.origin };
}

export function corsHeaders(requestOrigin) {
  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function handleError(caught, path = "unknown") {
  if (caught instanceof HttpError) return error(caught.code, caught.message, caught.status);
  console.error(JSON.stringify({ message: "request_failed", path, error: caught instanceof Error ? caught.message : "unknown" }));
  return error("internal_error", "Request could not be completed", 500);
}
