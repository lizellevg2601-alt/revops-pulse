import {digest,token,cookie,throttleRequest} from "../../lib/member-auth.mjs";
const json=(x,s=200,h={})=>Response.json(x,{status:s,headers:{"Cache-Control":"no-store",...h}});
const generic={message:"If your address has active lifetime access, a sign-in link will arrive shortly."};
const allowed=(r,e)=>r.headers.get("Origin")===new URL(e.APP_ORIGIN).origin;
export async function onRequestPost({request,env}){
 if(!env.REVOPS_DB||!env.APP_ORIGIN||!env.RESEND_API_KEY||!env.RESEND_FROM)return json({error:"not_configured"},503);
 if(!allowed(request,env))return json({error:"invalid_origin"},403);
 const raw=await request.text();
 if(raw.length>2048)return json({error:"too_large"},413);
 let body;try{body=JSON.parse(raw)}catch{return json({error:"bad_input"},400)}
 if(typeof body.email!=="string"||body.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))return json(generic,202);
 const email=body.email.trim().toLowerCase(),db=env.REVOPS_DB;
 try{
  // Per-IP first: catches one IP hammering many different email addresses, which the per-email
  // limiter below can't see at all.
  if(!await throttleRequest(db,request,"request-link",20))return json(generic,202);
  const rate=await db.prepare(`INSERT INTO member_login_rate(email,window_start,count) VALUES(?,unixepoch(),1)
   ON CONFLICT(email) DO UPDATE SET count=CASE WHEN window_start<unixepoch()-900 THEN 1 ELSE count+1 END,
   window_start=CASE WHEN window_start<unixepoch()-900 THEN unixepoch() ELSE window_start END RETURNING count`).bind(email).first();
  if(!rate||rate.count>3)return json(generic,202);
  const member=await db.prepare(`SELECT m.id FROM member_accounts m WHERE m.email=? AND EXISTS
   (SELECT 1 FROM member_payment_grants g WHERE g.member_id=m.id AND g.state='active')`).bind(email).first();
  if(!member)return json(generic,202);
  const value=token(),hash=await digest(value);
  await db.prepare("INSERT INTO member_login_tokens(token_hash,member_id,expires_at) VALUES(?,?,unixepoch()+900)").bind(hash,member.id).run();
  const url=new URL(env.APP_ORIGIN);url.pathname="/login/";url.hash="token="+encodeURIComponent(value);
  // A thrown fetch (network error/timeout) must clean up the token exactly like a non-OK
  // response does - previously only the latter was handled, leaving a live, un-notified token
  // if Resend was merely unreachable rather than returning an error status.
  try{
   const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:env.RESEND_FROM,to:[email],subject:"Your RevOps Pulse sign-in link",text:"Sign in securely: "+url.href+"\n\nExpires in 15 minutes."}),signal:AbortSignal.timeout(10000)});
   if(!res.ok)await db.prepare("DELETE FROM member_login_tokens WHERE token_hash=?").bind(hash).run();
  }catch{
   await db.prepare("DELETE FROM member_login_tokens WHERE token_hash=?").bind(hash).run();
  }
  return json(generic,202);
 }catch{return json(generic,202)}
}
