import test from "node:test";
import assert from "node:assert/strict";
import {isProtectedPath,onRequest} from "../functions/_middleware.js";
for(const p of ["/","/index.html","/index.txt","/__next.__PAGE__.txt","/__next._full.txt","/feed-data.json","/approved-intelligence.json"]){
 test("protects "+p,()=>assert.equal(isProtectedPath(p),true));
}
test("public login stays accessible",()=>assert.equal(isProtectedPath("/login/"),false));
test("paywall on, DB unavailable fails closed",async()=>{
 const request=new Request("https://example.com/feed-data.json");
 const response=await onRequest({request,env:{REVOPS_PAYWALL_ENABLED:"true"},next:()=>{throw Error("should not serve static content")}});
 assert.equal(response.status,503);
});
test("paywall off does not change existing public site",async()=>{
 const request=new Request("https://example.com/");
 const response=await onRequest({request,env:{REVOPS_PAYWALL_ENABLED:"false"},next:()=>new Response("existing site")});
 assert.equal(await response.text(),"existing site");
});
test("unauthenticated feed request blocked",async()=>{
 const request=new Request("https://example.com/approved-intelligence.json");
 const db={prepare:()=>({bind:()=>({first:async()=>null})})};
 const response=await onRequest({request,env:{REVOPS_PAYWALL_ENABLED:"true",REVOPS_DB:db},next:()=>new Response("should not render")});
 assert.equal(response.status,401);
});
