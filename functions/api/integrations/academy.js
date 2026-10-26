import {validateRevopsPurchaseEvent} from "../../../scripts/revops-purchase-contract.mjs";

const asJson=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const asBytes=(str)=>new TextEncoder().encode(str);
const hex=(bytes)=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("");
const toHex=(str)=>/^[0-9a-f]{64}$/i.test(str);
function fixedTimeEqual(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
async function verifyRequest(request,secret,body){
 if(typeof secret!=="string"||secret.length<32)return false;
 const timestamp=Number(request.headers.get("X-Revops-Timestamp"));
 const signature=(request.headers.get("X-Revops-Signature")||"").replace(/^sha256=/,"");
 if(!Number.isSafeInteger(timestamp)||Math.abs(Date.now()/1000-timestamp)>300||!toHex(signature))return false;
 const key=await crypto.subtle.importKey("raw",asBytes(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signed=await crypto.subtle.sign("HMAC",key,asBytes(String(timestamp)+"."+body));
 return fixedTimeEqual(signature.toLowerCase(),hex(signed));
}

// Deliberate (confirmed 2026-10-23): "disputed" is excluded from entitledMember()'s active-grant
// check, so a dispute revokes membership access immediately, unlike the Academy's own flag-only
// dispute policy for its digital products. Do not change this to match Academy without a fresh
// decision — see docs/ACADEMY_USD5_MEMBERSHIP_INTEGRATION.md.
//
// Conflict resolution below is a type-and-current-state transition check, NOT a timestamp
// comparison — Stripe event timestamps have second resolution and can't reliably order same-second
// events, and a stale replayed/delayed "payment.paid" must never be able to reactivate a grant that
// has since moved to refunded/disputed, no matter its timestamp. Only these transitions apply:
//   payment.refunded  -> refunded, from any current state (a refund is terminal)
//   payment.disputed  -> disputed, only from 'active'
//   payment.restored  -> active,   only from 'disputed' (explicitly reverses a dispute - never
//                                  applies to an already-refunded or already-active grant)
//   payment.paid      -> active,   only while still 'active' (idempotent refresh of a duplicate
//                                  completion event; never reapplies once moved on to
//                                  refunded/disputed)
const REVOPS_STATES={"payment.paid":"active","payment.refunded":"refunded","payment.disputed":"disputed","payment.restored":"active"};

export async function onRequestPost({request,env}){
 if(!env.REVOPS_DB||!env.REVOPS_EVENT_SECRET)return asJson({error:"not_configured"},503);
 const contentType=request.headers.get("content-type")||"";
 if(!contentType.startsWith("application/json"))return asJson({error:"invalid_type"},415);
 const length=Number(request.headers.get("Content-Length")||0);
 if(length>8192)return asJson({error:"too_large"},413);
 const reader=request.body?.getReader();let size=0;const chunks=[];
 if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();return asJson({error:"too_large"},413)}chunks.push(value)}}
 const body=new TextDecoder().decode(chunks.length===1?chunks[0]:Uint8Array.from(chunks.flatMap(chunk=>Array.from(chunk))));
 if(!await verifyRequest(request,env.REVOPS_EVENT_SECRET,body))return asJson({error:"unauthorized"},401);
 let event;
 try{event=validateRevopsPurchaseEvent(JSON.parse(body))}catch{return asJson({error:"invalid_event"},400)}
 const db=env.REVOPS_DB;
 try{
  const existingGrant=await db.prepare("SELECT m.email FROM member_payment_grants p JOIN member_accounts m ON p.member_id=m.id WHERE p.payment_intent_id=?").bind(event.paymentIntentId).first();
  if(event.type==="payment.paid"){
   // Only a fresh purchase asserts an identity; a different email for an existing payment must
   // never transfer ownership of the grant. (Also re-checked atomically inside the batch below -
   // this is the fast-path rejection, not the only guard.)
   if(existingGrant && existingGrant.email!==event.email)return asJson({error:"payment_owner_conflict"},409);
  }else if(!existingGrant){
   // Refund/dispute/restore for a payment this receiver has never recorded a payment.paid for -
   // most likely Academy's own payment.paid delivery for this payment just hasn't landed here
   // yet (webhook delivery order isn't guaranteed). Ask Academy to retry rather than silently
   // dropping a real entitlement change it will never redeliver once acknowledged.
   return asJson({error:"payment_not_yet_recorded"},503);
  }
  const memberId=crypto.randomUUID();
  const statements=[];
  if(event.email){
   statements.push(db.prepare("INSERT INTO member_accounts(id,email) VALUES(?,?) ON CONFLICT(email) DO NOTHING").bind(memberId,event.email));
  }
  const eventStatementIndex=statements.length;
  statements.push(db.prepare("INSERT OR IGNORE INTO member_payment_events(event_id,payment_intent_id,checkout_session_id,type,occurred_at) VALUES(?,?,?,?,?)")
   .bind(event.eventId,event.paymentIntentId,event.checkoutSessionId,event.type,event.occurredAt));
  const grantStatementIndex=statements.length;
  if(event.email){
   // payment.paid only: creates the grant on first purchase, or (re)applies it while the
   // ownership check above still holds true atomically (closes the race where a concurrent,
   // differently-claimed payment.paid for the same payment_intent_id could otherwise land
   // between the pre-check above and this write).
   statements.push(db.prepare(`
    INSERT INTO member_payment_grants(payment_intent_id,checkout_session_id,member_id,last_event_at,state)
    SELECT ?,?,id,?,'active' FROM member_accounts WHERE email=?
    ON CONFLICT(payment_intent_id) DO UPDATE SET last_event_at=excluded.last_event_at,state=excluded.state,updated_at=unixepoch()
    WHERE member_payment_grants.state='active'
      AND EXISTS (SELECT 1 FROM member_accounts a WHERE a.id=member_payment_grants.member_id AND a.email=?)
   `).bind(event.paymentIntentId,event.checkoutSessionId,event.occurredAt,event.email,event.email));
  }else{
   statements.push(db.prepare(`
    UPDATE member_payment_grants SET last_event_at=?,state=?,updated_at=unixepoch()
    WHERE payment_intent_id=?
      AND ((?='payment.refunded') OR (?='payment.disputed' AND state='active') OR (?='payment.restored' AND state='disputed'))
   `).bind(event.occurredAt,REVOPS_STATES[event.type],event.paymentIntentId,event.type,event.type,event.type));
  }
  const results=await db.batch(statements);
  const eventInsert=results[eventStatementIndex];
  if(!eventInsert?.meta?.changes)return asJson({received:true,duplicate:true});
  const grantResult=results[grantStatementIndex];
  if(!grantResult?.meta?.changes){
   // The event itself was new and is durably recorded (so Academy will never redeliver it), but
   // its transition did not apply - either the ownership race above, or the transition isn't
   // valid from the grant's current state (e.g. a stale/duplicate payment.paid after a dispute).
   // Not a failure Academy should retry; nothing further to apply.
   return asJson({received:true,applied:false});
  }
  return asJson({received:true});
 }catch{
  return asJson({error:"storage_error"},503);
 }
}
export async function onRequest(){return asJson({error:"method_not_allowed"},405)}
