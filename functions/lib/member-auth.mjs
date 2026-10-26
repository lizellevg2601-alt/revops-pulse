export const SESSION_COOKIE="revops_session";
const enc=new TextEncoder();
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value))),x=>x.toString(16).padStart(2,"0")).join("")}
export function token(){const b=new Uint8Array(32);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")}
export function cookie(value){return SESSION_COOKIE+"="+encodeURIComponent(value)+"; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000"}
export function getCookie(header){const m=String(header||"").match(/(?:^|;\s*)revops_session=([^;]+)/);return m?decodeURIComponent(m[1]):null}

// Per-IP limiter, independent of any per-email limiter: an email-keyed limit alone can't catch
// one IP hammering many different email addresses. Ported from the superseded partner branch's
// functions/lib/security.mjs (adapted to this file's own digest()/placeholder style) - that's the
// one piece worth reusing from it, not the branch wholesale.
export async function throttleRequest(db,request,scope,limit,windowSeconds=900,nowSeconds=Math.floor(Date.now()/1000)){
 const clientAddress=request.headers.get("CF-Connecting-IP")||"unknown";
 const keyHash=await digest(scope+":"+clientAddress);
 const throttle=await db.prepare(`
  INSERT INTO request_throttles (scope,key_hash,window_started_at,request_count)
  VALUES (?,?,?,1)
  ON CONFLICT(scope,key_hash) DO UPDATE SET
   window_started_at=CASE WHEN window_started_at<=?-? THEN ? ELSE window_started_at END,
   request_count=CASE WHEN window_started_at<=?-? THEN 1 ELSE request_count+1 END
  RETURNING request_count
 `).bind(scope,keyHash,nowSeconds,nowSeconds,windowSeconds,nowSeconds,nowSeconds,windowSeconds).first();
 return Boolean(throttle && throttle.request_count<=limit);
}
export async function entitledMember(db,request){
 const value=getCookie(request.headers.get("Cookie"));
 if(!value||value.length>128)return null;
 return db.prepare(`SELECT m.id,m.email FROM member_sessions s
 JOIN member_accounts m ON m.id=s.member_id
 WHERE s.token_hash=? AND s.expires_at>unixepoch()
 AND EXISTS (SELECT 1 FROM member_payment_grants g WHERE g.member_id=m.id AND g.state='active')
 LIMIT 1`).bind(await digest(value)).first();
}
