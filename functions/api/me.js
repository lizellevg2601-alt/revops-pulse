import {entitledMember} from "../lib/member-auth.mjs";
export async function onRequestGet({request,env}){
 if(!env.REVOPS_DB)return Response.json({authenticated:false},{status:503,headers:{"Cache-Control":"no-store"}});
 try{const member=await entitledMember(env.REVOPS_DB,request);
 return Response.json(member?{authenticated:true,email:member.email}:{authenticated:false},{status:member?200:401,headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({authenticated:false},{status:503,headers:{"Cache-Control":"no-store"}})}
}
