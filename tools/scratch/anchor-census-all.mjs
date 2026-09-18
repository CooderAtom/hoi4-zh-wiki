// Site-wide census of in-page anchors whose target id does not exist.
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'site';
let pages = 0, pagesBad = 0, totalAnchors = 0, unresolved = 0;
const rows = [];
for (const f of fs.readdirSync(SITE).filter((x) => x.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const want = [...new Set([...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))];
  if (!want.length) continue;
  pages++; totalAnchors += want.length;
  const miss = want.filter((a) => !ids.has(a));
  if (miss.length) { pagesBad++; unresolved += miss.length; rows.push({ f, n: want.length, miss: miss.length, sample: miss.slice(0, 3) }); }
}
rows.sort((a, b) => b.miss - a.miss);
console.log(`pages with anchors: ${pages}`);
console.log(`pages with >=1 unresolved anchor: ${pagesBad}`);
console.log(`total distinct anchors: ${totalAnchors}, unresolved: ${unresolved}`);
console.log('\ntop 25 pages:');
for (const r of rows.slice(0, 25)) console.log(`${String(r.miss).padStart(4)}/${String(r.n).padStart(4)}  ${r.f.padEnd(44)} e.g. ${r.sample.join(', ')}`);
fs.writeFileSync('data/work/anchors.json', JSON.stringify(rows, null, 1));
console.log('\nfull list -> data/work/anchors.json');
