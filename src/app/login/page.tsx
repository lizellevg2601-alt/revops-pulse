"use client";
import {useEffect,useState} from "react";
export default function MemberLogin(){
 const [email,setEmail]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const token=new URLSearchParams(window.location.hash.slice(1)).get("token");
  if(!token)return;
  window.history.replaceState(null,"",window.location.pathname);
  void (async()=>{
   setBusy(true);
   try{const res=await fetch("/api/auth/consume",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
     if(!res.ok)throw Error("This link has expired or membership is inactive.");
     window.location.assign("/");
   }catch(e){setNotice(e instanceof Error?e.message:"Sign-in failed.");setBusy(false)}
  })();
 },[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setNotice("");
  try{const res=await fetch("/api/auth/request-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
  if(!res.ok)throw Error("Unable to request sign-in right now.");
  setNotice("If this email has lifetime access, a sign-in link is on its way.");
  }catch(e){setNotice(e instanceof Error?e.message:"Request failed.");}finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6"><section className="w-full max-w-md rounded-3xl bg-white p-9 shadow-sm"><p className="text-xs uppercase tracking-widest">RevOps Pulse members</p><h1 className="mt-3 text-3xl font-semibold">Sign in to your intelligence</h1><p className="mt-3 text-sm">Enter the email used at GTM Academy checkout. We'll send you a secure one-time link.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block w-full rounded-lg border p-3"/></label><button disabled={busy} className="rounded-xl bg-black px-6 py-3 text-white">{busy?"Please wait":"Email me a sign-in link"}</button></form>{notice&&<p role="status" className="mt-4 text-sm">{notice}</p>}</section></main>
}
