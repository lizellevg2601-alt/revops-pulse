import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const key=process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY GitHub Actions secret is missing.");
const raw=JSON.parse(readFileSync("public/feed-data.json","utf8"));
const items=(Array.isArray(raw.items)?raw.items:[])
  .filter(x=>x.type==="article" && typeof x.title==="string" && /^https:\/\//.test(x.sourceUrl||""))
  .sort((a,b)=>Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0))
  .slice(0,3)
  .map(x=>({title:x.title,source:x.source,url:x.sourceUrl,summary:typeof x.summary==="string"?x.summary.slice(0,650):"",publishedAt:x.publishedAt,category:x.category}));
if (!items.length) throw new Error("No eligible RSS metadata available.");
const instructions=`You draft for an editor, never publish. You only have RSS metadata, NOT article bodies or verified reporting. Treat all RSS claims as unverified. No invented facts, numbers, quotations, external sources, or claims of corroboration. Produce ONE cautious structured exploratory editorial draft per input item in valid JSON as {"drafts":[{"title":"...","category":"crm|ai|revops|gtm","sources":"https://...","facts":"Unverified RSS metadata only: ...","whatChanged":"...","why":"...","implications":"...","watch":"...","action":"...","editor":""}]}. Write independent prose, not copied RSS headline or snippets. The editor must open original links and verify every substantive claim before approval. Keep facts explicitly tentative. Editorial recommendation is a suggested question or hypothesis, not the editor's personal opinion. No markdown fencing.`;
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),45000);
let response;
try{
 response=await fetch("https://api.openai.com/v1/responses",{
  method:"POST",signal:controller.signal,
  headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
  body:JSON.stringify({model:"gpt-4.1-mini",instructions,input:JSON.stringify(items),max_output_tokens:3500,store:false})
 });
}finally{clearTimeout(timeout)}
if(!response.ok) throw new Error(`OpenAI request failed with HTTP ${response.status}; no response body or secrets logged.`);
const payload=await response.json();
const answer=(payload.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
if(!answer) throw new Error("The model returned no draft text.");
let parsed;
try{parsed=JSON.parse(answer)}catch{throw new Error("Model returned invalid JSON; nothing published.");}
if(!Array.isArray(parsed.drafts)||!parsed.drafts.length||parsed.drafts.length>3)throw new Error("Unexpected draft response; nothing published.");
const inputUrls=new Set(items.map(x=>x.url));
for(const d of parsed.drafts){
 if(!["crm","ai","revops","gtm"].includes(d.category)||!inputUrls.has(d.sources))throw new Error("Draft contains unexpected category or source URL.");
 for(const k of ["title","facts","whatChanged","why","implications","watch","action"])if(typeof d[k]!=="string"||!d[k].trim())throw new Error("Incomplete draft.");
 d.editor="";d.status="draft";d.version=1;
}
mkdirSync("editorial-output",{recursive:true});
for(const [i,d] of parsed.drafts.entries()){
 const file=`editorial-output/draft-${String(i+1).padStart(2,"0")}-${createHash("sha256").update(d.sources).digest("hex").slice(0,8)}.json`;
 writeFileSync(file,JSON.stringify(d,null,2)+"\n");
}
console.log(`Created ${parsed.drafts.length} unverified editorial draft(s) as workflow artifacts. No site content updated.`);
