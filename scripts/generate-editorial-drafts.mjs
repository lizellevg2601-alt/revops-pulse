import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const key=process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY GitHub Actions secret is missing.");
const raw=JSON.parse(readFileSync("public/feed-data.json","utf8"));
const focus=[
  ["revenue operations",10],["revops",10],["go-to-market",10],["gtm",8],
  ["salesforce",8],["hubspot",8],["crm",8],["sales pipeline",9],
  ["sales enablement",8],["marketing operations",8],["customer success",8],
  ["lead generation",7],["revenue intelligence",9],["sales automation",8],
  ["sales operations",9],["b2b",5],["enterprise sales",8],
  ["account-based",7],["sales forecasting",8],["buyer intent",7],
  ["ai agents",4],["enterprise ai",3],["pricing strategy",6]
];
const distant=["robotics","3d simulation","ai safety bill","military","semiconductor","video game"];
function rank(item){
  const title=(item.title||"").toLowerCase();
  const body=[item.summary,...(Array.isArray(item.tags)?item.tags:[])].filter(x=>typeof x==="string").join(" ").toLowerCase();
  let score=focus.reduce((n,[word,weight])=>n+(title.includes(word)?weight*2:body.includes(word)?weight:0),0);
  if(["crm","revops","gtm"].includes(item.category))score+=7;
  if(distant.some(word=>title.includes(word)))score-=12;
  return score;
}
const candidates=(Array.isArray(raw.items)?raw.items:[])
  .filter(x=>x.type==="article" && typeof x.title==="string" && /^https:\/\//.test(x.sourceUrl||""))
  .map(x=>({item:x,score:rank(x)}))
  .filter(x=>x.score>=7)
  .sort((a,b)=>b.score-a.score || Date.parse(b.item.publishedAt||0)-Date.parse(a.item.publishedAt||0));
const seen=new Set();
const items=candidates.filter(x=>{const url=x.item.sourceUrl.split("?")[0];if(seen.has(url))return false;seen.add(url);return true;})
  .slice(0,3)
  .map(({item:x,score})=>({title:x.title,source:x.source,url:x.sourceUrl,summary:typeof x.summary==="string"?x.summary.slice(0,650):"",publishedAt:x.publishedAt,category:x.category,editorialRelevanceScore:score}));
if (!items.length) throw new Error("No relevant RevOps/GTM articles met the minimum threshold; no AI request made.");
const instructions=`You are a research ASSISTANT creating UNVERIFIED editorial briefing drafts for experienced RevOps, GTM, B2B sales, marketing operations and customer-success leaders. You receive only RSS metadata, NEVER the original article text, permission to reproduce publisher prose, independently confirmed evidence, or multi-source corroboration. Do NOT claim otherwise. The task is one original draft per selected RSS item (not multi-source synthesis). Distinguish: 1) WHAT RSS METADATA ASSERTS (explicitly unverified), 2) conditional COMMERCIAL IMPLICATION (reasoned hypothesis), 3) what the human editor MUST verify. Do not invent statistics, legislative provisions, timelines, quotes, examples, second sources, or specific product functionality. If a connection to revenue operations is weak, say so candidly. Avoid empty statements like 'AI could drive innovation' and 'monitor developments': instead name a concrete revenue-team decision, test, or operational metric when reasonably inferable, always framed conditionally. Never claim your suggestions are the editor's own judgment. No promotional tone. Output ONLY a valid JSON object with {"drafts":[{"title":"original, non-copied, commercially relevant question/headline","category":"crm|ai|revops|gtm","sources":"exact supplied HTTPS URL","facts":"Unverified RSS metadata: [specific bounded assertion]; verification required: [specific primary-source and date checks]","whatChanged":"Attribution-conscious summary of what metadata alleges, not asserted fact","why":"Specific relevance to revenue teams, conditional","implications":"Hypothesis identifying affected workflow, buying cycle, channel or reporting","watch":"Concrete indicators and measurements for a human editor to check","action":"Proposed editorial angle or decision framework for editor to evaluate, not a personal opinion","editor":""}]}. Each draft must exactly match one supplied source URL and relevant category. Strict JSON with no markdown fences.`;
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
