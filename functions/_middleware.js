import {entitledMember} from "./lib/member-auth.mjs";
// Deny-by-default: anything not explicitly listed here requires an active member session,
// including any new page, API route, or Next.js static-export representation added later.
// Previously this was the reverse (an allowlist of things TO protect), which missed real build
// output (__next._head.txt, __next._index.txt, __next._tree.txt) simply because nobody thought to
// add them - the inverse (public-by-exception) can't have that class of gap, since a path nobody
// has reasoned about yet defaults to protected, not public. Keep public/_routes.json's exclude
// list and this list describing the same public surface - see paywall.test.mjs's cross-check.
const PUBLIC_EXACT=new Set(["/_routes.json","/favicon.ico","/file.svg","/globe.svg","/next.svg","/vercel.svg","/window.svg","/404.html"]);
const PUBLIC_PREFIXES=["/_next/","/login","/api/auth/","/api/integrations/"];
export function isProtectedPath(path){
 const p=path.replace(/\/$/,"")||"/";
 if(PUBLIC_EXACT.has(p))return false;
 if(PUBLIC_PREFIXES.some(prefix=>p.startsWith(prefix)))return false;
 return true;
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
