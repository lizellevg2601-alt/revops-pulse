import {digest,token,cookie} from "../../lib/member-auth.mjs";
const json=(v,s=200,h={})=>Response.json(v,{status:s,headers:{"Cache-Control":"no-store",...h}});
export async function onRequestPost({request,env}){
 if(!env.REVOPS_DB||!env.APP_ORIGIN)return json({error:"not_configured"},503);
 if(request.headers.get("Origin")!==new URL(env.APP_ORIGIN).origin)return json({error:"invalid_origin"},403);
 const raw=await request.text();if(raw.length>2048)return json({error:"too_large"},413);
 let body;try{body=JSON.parse(raw)}catch{return json({error:"invalid_input"},400)}
 if(typeof body.token!=="string"||body.token.length<32||body.token.length>128)return json({error:"invalid_token"},400);
 const db=env.REVOPS_DB;
 try{
  const used=await db.prepare(`UPDATE member_login_tokens SET consumed_at=unixepoch() WHERE token_hash=?
  AND consumed_at IS NULL AND expires_at>unixepoch() RETURNING member_id`).bind(await digest(body.token)).first();
  if(!used)return json({error:"invalid_or_expired"},400);
  const allowed=await db.prepare("SELECT 1 FROM member_payment_grants WHERE member_id=? AND state='active' LIMIT 1").bind(used.member_id).first();
  if(!allowed)return json({error:"access_inactive"},403);
  const value=token();
  await db.prepare("INSERT INTO member_sessions(token_hash,member_id,expires_at) VALUES(?,?,unixepoch()+2592000)").bind(await digest(value),used.member_id).run();
  return json({authenticated:true},200,{"Set-Cookie":cookie(value)});
 }catch{return json({error:"auth_unavailable"},503)}
}
