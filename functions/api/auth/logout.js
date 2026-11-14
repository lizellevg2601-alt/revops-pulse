import {digest,getCookie,SESSION_COOKIE} from "../../lib/member-auth.mjs";
export async function onRequestPost({request,env}){
 if(!env.REVOPS_DB||!env.APP_ORIGIN)return Response.json({error:"not_configured"},{status:503});
 if(request.headers.get("Origin")!==new URL(env.APP_ORIGIN).origin)return Response.json({error:"invalid_origin"},{status:403});
 const existing=getCookie(request.headers.get("Cookie"));
 if(existing){try{await env.REVOPS_DB.prepare("DELETE FROM member_sessions WHERE token_hash=?").bind(await digest(existing)).run()}catch{return Response.json({error:"service_unavailable"},{status:503})}}
 return Response.json({signedOut:true},{headers:{"Cache-Control":"no-store","Set-Cookie":SESSION_COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"}});
}
