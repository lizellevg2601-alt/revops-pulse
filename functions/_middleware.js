import {entitledMember} from "./lib/member-auth.mjs";
const protectedPaths=new Set(["/","/index.html","/index.txt","/__next.__PAGE__.txt","/__next._full.txt","/feed-data.json","/approved-intelligence.json"]);
export function isProtectedPath(path){
 const p=path.replace(/\/$/,"")||"/";
 return protectedPaths.has(p)||p.startsWith("/api/me")||p.startsWith("/api/member/");
}
const fail=(status)=>new Response("Membership access unavailable",{status,headers:{"Cache-Control":"no-store"}});
export async function onRequest(context){
 const {request,env}=context;
 const path=new URL(request.url).pathname;
 if(!isProtectedPath(path))return context.next();
 // Explicit staging opt-in: preview remains viewable before D1 is provisioned.
 // Production cannot be enabled accidentally by a missing binding.
 if(env.REVOPS_PAYWALL_ENABLED!=="true")return context.next();
 if(!env.REVOPS_DB)return fail(503);
 try{
  const member=await entitledMember(env.REVOPS_DB,request);
  if(!member){
   if(path.startsWith("/api/")||path.endsWith(".json")||path.endsWith(".txt"))return fail(401);
   return Response.redirect(new URL("/login/",request.url),302);
  }
  context.data.member=member;
  const response=await context.next();
  const headers=new Headers(response.headers);
  headers.set("Cache-Control","private, no-store");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }catch{return fail(503)}
}
