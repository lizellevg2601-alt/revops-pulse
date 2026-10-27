"use client";

import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, ShieldCheck } from "lucide-react";

type Article = {
  id: string; title: string; category: "crm"|"ai"|"revops"|"gtm";
  whatChanged: string; why: string; implications: string; watch: string; action: string;
  editor: string; approvedAt: string; sources: string[];
};
const labels: Record<Article["category"],string> = {crm:"CRM & Tech",ai:"Frontier AI",revops:"Revenue Operations",gtm:"GTM Trends"};
export function ApprovedIntelligence({ category }: {category:string}) {
  const [articles,setArticles]=useState<Article[]>([]);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{fetch("/approved-intelligence.json").then(r=>r.ok?r.json():[]).then(data=>setArticles(Array.isArray(data)?data:[])).catch(()=>setArticles([])).finally(()=>setLoaded(true))},[]);
  const filtered=articles.filter(a=>category==="all" || a.category===category).sort((a,b)=>Date.parse(b.approvedAt)-Date.parse(a.approvedAt));
  if (!loaded) return null;
  return <section className="my-8" aria-labelledby="original-intelligence-heading">
    <div className="mb-4 flex items-center gap-3"><BookOpen className="h-6 w-6 text-[var(--coral-500)]"/><div><h2 id="original-intelligence-heading" className="font-editorial text-2xl font-semibold text-[var(--navy-950)]">Original intelligence</h2><p className="text-xs text-[var(--slate-500)]">Human-reviewed original analysis · Sources linked for verification</p></div></div>
    {filtered.length===0 ? <div className="rounded-2xl border border-[var(--border)] bg-white p-5 text-sm text-[var(--slate-700)]">No original editor-approved briefings have been published yet. The monitored updates below link to external publications and are not presented as independently verified RevOps Pulse research.</div> :
    <div className="grid gap-4 md:grid-cols-2">{filtered.map(a=><article key={a.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="h-36 bg-gradient-to-br from-[#12232e] via-[#43546b] to-[#ec947c] p-5 text-white"><span className="text-xs font-semibold uppercase tracking-widest">RevOps Pulse | {labels[a.category]}</span><div className="mt-8 text-xs opacity-80">Original editorial intelligence</div></div>
      <div className="space-y-3 p-5"><h3 className="font-editorial text-xl font-semibold">{a.title}</h3><p className="text-xs text-[var(--slate-500)]">Reviewed {new Date(a.approvedAt).toLocaleDateString()} · {a.editor}</p>
      <p className="text-sm"><strong>What changed:</strong> {a.whatChanged}</p><p className="text-sm"><strong>Why it matters:</strong> {a.why}</p><p className="text-sm"><strong>Our perspective:</strong> {a.implications}</p><p className="text-sm"><strong>What to watch:</strong> {a.watch}</p><p className="rounded-xl bg-[var(--coral-50)] p-3 text-sm"><strong>What we'd recommend:</strong> {a.action}</p>
      <div className="border-t pt-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="h-4 w-4 text-[var(--coral-500)]"/>Sources and further reading</div><div className="space-y-1">{a.sources.map((src,i)=><a className="flex items-center gap-1 break-all text-xs text-[var(--coral-500)] underline" key={src} href={src} rel="noopener noreferrer" target="_blank">Source {i+1}: {(()=>{try{return new URL(src).hostname}catch{return "External source"}})()}<ExternalLink className="h-3 w-3"/></a>)}</div></div>
      </div></article>)}</div>}
  </section>;
}
