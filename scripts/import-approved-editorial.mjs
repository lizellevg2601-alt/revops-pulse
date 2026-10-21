import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const file=process.argv[2];
if (!file) throw new Error("Usage: node scripts/import-approved-editorial.mjs <approved-export.json>");
const draft=JSON.parse(readFileSync(resolve(file),"utf8"));
const required=["title","whatChanged","why","implications","watch","action","editor","facts","sources"];
if (draft.status!=="approved_for_manual_import" || !draft.approvedAt || !Array.isArray(draft.checks) || draft.checks.length!==6) throw new Error("Requires completed Editorial Studio approval export");
for (const key of required) if (typeof draft[key]!=="string" || !draft[key].trim()) throw new Error("Missing "+key);
if (!["crm","ai","revops","gtm"].includes(draft.category)) throw new Error("Invalid category");
const urls=draft.sources.split("\n").map(s=>s.trim()).filter(Boolean);
if (!urls.length || urls.some(s=>{try{return new URL(s).protocol!=="https:"}catch{return true}})) throw new Error("Every source must be an HTTPS URL");
const record={
  id:createHash("sha256").update(draft.title+draft.approvedAt).digest("hex").slice(0,16),
  category:draft.category,
  title:draft.title.trim(),
  whatChanged:draft.whatChanged.trim(),
  why:draft.why.trim(),
  implications:draft.implications.trim(),
  watch:draft.watch.trim(),
  action:draft.action.trim(),
  editor:draft.editor.trim(),
  approvedAt:draft.approvedAt,
  sources:urls
};
const out=resolve("public/approved-intelligence.json");
const existing=JSON.parse(readFileSync(out,"utf8"));
if (!Array.isArray(existing)) throw new Error("Publication store must be an array");
const next=[record,...existing.filter(x=>x.id!==record.id)];
writeFileSync(out,JSON.stringify(next,null,2)+"\n");
console.log("Added approved article:",record.id,"— Review the git diff before committing.");
