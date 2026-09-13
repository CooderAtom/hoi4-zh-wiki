// Confirm pages are present in the offline search index with their Chinese body text.
//   node tools/scratch/index-check.mjs "Page A" "Page B" ...
import fs from 'node:fs';
const s = fs.readFileSync('site/assets/search-index.js', 'utf8');
const start = s.indexOf('[');
const end = s.lastIndexOf(']');
let arr;
try { arr = JSON.parse(s.slice(start, end + 1)); }
catch (e) { console.error('could not parse index:', e.message); process.exit(1); }

console.log(`index entries: ${arr.length}`);
const want = process.argv.slice(2);
if (!want.length) process.exit(0);
const byTitle = new Map(arr.map((e) => [e.t, e]));
let bad = 0;
for (const p of want) {
  const e = byTitle.get(p);
  if (!e) { console.log(`  MISSING from index: ${p}`); bad++; continue; }
  const cjk = (e.b.match(/[\u4e00-\u9fff]/g) || []).length;
  console.log(`  ${p.padEnd(26)} bodyLen=${String(e.b.length).padStart(5)}  CJK=${String(cjk).padStart(5)}  href=${e.h}`);
  if (!cjk) bad++;
}
console.log(bad ? `FAIL: ${bad} page(s) missing or without Chinese` : 'ok: all listed pages indexed with Chinese text');
process.exitCode = bad ? 1 : 0;
