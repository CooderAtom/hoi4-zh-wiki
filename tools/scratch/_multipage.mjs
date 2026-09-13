import fs from 'node:fs';
const dir = 'data/pageblocks';
const byPage = new Map();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  if (!byPage.has(b.page)) byPage.set(b.page, []);
  byPage.get(b.page).push({ f, keys: (b.items || []).map((i) => i.k) });
}
let multi = 0;
for (const [p, list] of [...byPage].sort()) {
  if (list.length < 2) continue;
  multi++;
  const seen = new Map();
  let overlaps = 0;
  for (const x of list) for (const k of x.keys) { if (seen.has(k)) overlaps++; else seen.set(k, x.f); }
  console.log(p + '  files=' + list.length + '  crossFileOverlaps=' + overlaps);
  for (const x of list) console.log('    ' + x.f + '  ' + x.keys.length);
}
console.log('pagesWithMultipleBatches=' + multi);
