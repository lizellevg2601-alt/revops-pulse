export const SESSION_COOKIE="revops_session";
const enc=new TextEncoder();
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value))),x=>x.toString(16).padStart(2,"0")).join("")}
export function token(){const b=new Uint8Array(32);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")}
export function cookie(value){return SESSION_COOKIE+"="+encodeURIComponent(value)+"; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000"}
export function getCookie(header){const m=String(header||"").match(/(?:^|;\s*)revops_session=([^;]+)/);return m?decodeURIComponent(m[1]):null}
export async function entitledMember(db,request){
 const value=getCookie(request.headers.get("Cookie"));
 if(!value||value.length>128)return null;
 return db.prepare(`SELECT m.id,m.email FROM member_sessions s
 JOIN member_accounts m ON m.id=s.member_id
 WHERE s.token_hash=? AND s.expires_at>unixepoch()
 AND EXISTS (SELECT 1 FROM member_payment_grants g WHERE g.member_id=m.id AND g.state='active')
 LIMIT 1`).bind(await digest(value)).first();
}
