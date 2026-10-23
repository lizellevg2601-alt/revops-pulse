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
 // This is a staging foundation, not a substitute for a complete paid-entitlement system.
 // Atomic D1 batch provides event deduplication and projection updates.
 // Deliberate (confirmed 2026-10-23): "disputed" is excluded from entitledMember()'s active-grant
 // check, so a dispute revokes membership access immediately, unlike the Academy's own flag-only
 // dispute policy for its digital products. Do not change this to match Academy without a fresh
 // decision — see docs/ACADEMY_USD5_MEMBERSHIP_INTEGRATION.md.
 const states={"payment.paid":"active","payment.refunded":"refunded","payment.disputed":"disputed","payment.restored":"active"};
 const email=event.email;
 const memberId=crypto.randomUUID();
 const db=env.REVOPS_DB;
 try{
  // A different buyer email for an existing Stripe payment must not transfer ownership.
  const samePayment=await db.prepare("SELECT m.email FROM member_payment_grants p JOIN member_accounts m ON p.member_id=m.id WHERE p.payment_intent_id=?").bind(event.paymentIntentId).first();
  if(samePayment && samePayment.email!==email)return asJson({error:"payment_owner_conflict"},409);
  // Dedup via the INSERT's own result, not a preceding SELECT: two concurrent deliveries of the
  // same event must not both pass a check-then-act race. INSERT OR IGNORE + checking its own
  // row-count is atomic within this one D1 batch; only the delivery that actually inserts applies the grant.
  const [, eventInsert]=await db.batch([
   db.prepare("INSERT INTO member_accounts(id,email) VALUES(?,?) ON CONFLICT(email) DO NOTHING").bind(memberId,email),
   db.prepare("INSERT OR IGNORE INTO member_payment_events(event_id,payment_intent_id,checkout_session_id,type,occurred_at) VALUES(?,?,?,?,?)").bind(event.eventId,event.paymentIntentId,event.checkoutSessionId,event.type,event.occurredAt),
   db.prepare(`INSERT INTO member_payment_grants(payment_intent_id,checkout_session_id,member_id,last_event_at,state)
   SELECT ?,?,id,?,? FROM member_accounts WHERE email=?
   ON CONFLICT(payment_intent_id) DO UPDATE SET
   last_event_at=excluded.last_event_at,state=excluded.state,updated_at=unixepoch()
   WHERE excluded.last_event_at >= member_payment_grants.last_event_at`).bind(event.paymentIntentId,event.checkoutSessionId,event.occurredAt,states[event.type],email)
  ]);
  if(!eventInsert?.meta?.changes)return asJson({received:true,duplicate:true});
  return asJson({received:true});
 }catch{
  return asJson({error:"storage_error"},503);
 }
}
export async function onRequest(){return asJson({error:"method_not_allowed"},405)}
