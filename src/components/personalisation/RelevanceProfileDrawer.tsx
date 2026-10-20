"use client";
import { useEffect, useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import type { RelevanceProfile } from "@/lib/types";

const roles = ["RevOps Leader", "Revenue Operations", "Sales Operations", "Marketing Operations", "Customer Success", "GTM Leader", "Founder / Operator", "AI & Automation"];
const regions = ["Global", "North America", "United Kingdom", "Europe", "Latin America", "Middle East & Africa", "Asia Pacific"];
const interests = ["AI agents", "AI & Automation", "Revenue Operations", "GTM Strategy", "Sales Operations", "Marketing Operations", "Customer Success", "Salesforce", "HubSpot", "data quality", "forecasting", "customer retention", "analytics", "workflows"];
export function RelevanceProfileDrawer({profile,open,onOpen,onClose,onSave}: {profile:RelevanceProfile;open:boolean;onOpen:()=>void;onClose:()=>void;onSave:(profile:RelevanceProfile)=>void}) {
  const [draft,setDraft]=useState(profile);
  useEffect(()=>{if(open)setDraft(profile)},[open,profile]);
  const toggle=(key:"functionFocus"|"region"|"boostedKeywords",item:string)=>setDraft(prev=>({...prev,[key]:prev[key].includes(item)?prev[key].filter(x=>x!==item):[...prev[key],item]}));
  return <>
    <button onClick={onOpen} className="flex items-center gap-2 text-sm text-[var(--slate-500)] hover:text-[var(--coral-500)]"><SlidersHorizontal className="h-4 w-4"/> My Relevance Profile</button>
    {open && <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
      <section role="dialog" aria-modal="true" aria-label="Edit relevance profile" className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b px-6 py-5"><div><h2 className="font-editorial text-xl font-semibold">Make this feed yours</h2><p className="mt-1 text-xs text-[var(--slate-500)]">Choose what matters to you. Preferences are saved on this device.</p></div><button aria-label="Close settings" onClick={onClose}><X className="h-5 w-5"/></button></header>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <label className="block text-sm font-semibold">Your role<select className="mt-2 w-full rounded-xl border bg-white p-3 text-sm" value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}>{roles.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="block text-sm font-semibold">Organisation size<select className="mt-2 w-full rounded-xl border bg-white p-3 text-sm" value={draft.orgSize} onChange={e=>setDraft({...draft,orgSize:e.target.value})}>{["Startup","SMB","Mid-market","Enterprise"].map(x=><option key={x}>{x}</option>)}</select></label>
          <fieldset><legend className="mb-2 text-sm font-semibold">Region(s)</legend><div className="flex flex-wrap gap-2">{regions.map(x=><button type="button" key={x} aria-pressed={draft.region.includes(x)} onClick={()=>toggle("region",x)} className={`rounded-full border px-3 py-2 text-xs ${draft.region.includes(x)?"border-[var(--coral-500)] bg-[var(--coral-50)] text-[var(--coral-500)]":"bg-white"}`}>{x}</button>)}</div></fieldset>
          <fieldset><legend className="mb-2 text-sm font-semibold">Functional focus</legend><div className="flex flex-wrap gap-2">{roles.slice(1).map(x=><button type="button" key={x} aria-pressed={draft.functionFocus.includes(x)} onClick={()=>toggle("functionFocus",x)} className={`rounded-full border px-3 py-2 text-xs ${draft.functionFocus.includes(x)?"border-[var(--coral-500)] bg-[var(--coral-50)] text-[var(--coral-500)]":"bg-white"}`}>{x}</button>)}</div></fieldset>
          <fieldset><legend className="mb-2 text-sm font-semibold">Topics of interest</legend><div className="flex flex-wrap gap-2">{interests.map(x=><button type="button" key={x} aria-pressed={draft.boostedKeywords.includes(x)} onClick={()=>toggle("boostedKeywords",x)} className={`rounded-full border px-3 py-2 text-xs ${draft.boostedKeywords.includes(x)?"border-[var(--coral-500)] bg-[var(--coral-50)] text-[var(--coral-500)]":"bg-white"}`}>{x}</button>)}</div></fieldset>
          <label className="block text-sm font-semibold">Content depth<select className="mt-2 w-full rounded-xl border bg-white p-3 text-sm" value={draft.preferredDepth} onChange={e=>setDraft({...draft,preferredDepth:e.target.value as RelevanceProfile["preferredDepth"]})}><option value="brief">Brief</option><option value="balanced">Balanced</option><option value="deep">Deep analysis</option></select></label>
          <label className="block text-sm font-semibold">Content emphasis<select className="mt-2 w-full rounded-xl border bg-white p-3 text-sm" value={draft.strategicWeight>draft.tacticalWeight?"strategic":"tactical"} onChange={e=>setDraft({...draft,strategicWeight:e.target.value==="strategic"?70:30,tacticalWeight:e.target.value==="strategic"?30:70})}><option value="strategic">Strategic insights</option><option value="tactical">Practical how-tos</option></select></label>
          <label className="flex items-center justify-between gap-4 text-sm font-semibold">Prioritise podcasts<input type="checkbox" checked={draft.podcastWeight>50} onChange={e=>setDraft({...draft,podcastWeight:e.target.checked?80:50})} className="accent-[#F26D5C]"/></label>
          <label className="block text-sm font-semibold">Hide topics (comma separated)<textarea className="mt-2 w-full rounded-xl border p-3 text-sm" rows={2} value={draft.blockedTopics.join(", ")} onChange={e=>setDraft({...draft,blockedTopics:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></label>
        </div>
        <footer className="flex justify-end gap-3 border-t bg-white p-5"><button onClick={onClose} className="rounded-full border px-5 py-2 text-sm">Cancel</button><button onClick={()=>onSave(draft)} className="rounded-full bg-[var(--coral-500)] px-5 py-2 text-sm font-semibold text-white">Save preferences</button></footer>
      </section>
    </div>}
  </>;
}
