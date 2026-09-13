// Uncovered items for an arbitrary index range of the canonical bulk list.
//   node tools/scratch/_rangemiss.mjs <start> <endExclusive> [outFile]
import fs from 'node:fs';
const start = Number(process.argv[2] || 0);
const end = Number(process.argv[3] || 1342);
const outFile = process.argv[4] || 'tools/scratch/_rangemiss.json';
const dir = 'data/pageblocks';
const canon = JSON.parse(fs.readFileSync('tools/scratch/bulk/BULK.ALL.json', 'utf8')).items;
const slice = canon.slice(start, end);
const landed = new Map();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) if (!landed.has(it.k)) landed.set(it.k, { zh: it.zh, f });
}
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const enByK = new Map(units.map((u) => [u.k, u.en]));
const TOK = /⟦\s*(\d+)\s*⟧/g;
const seq = (s) => { const o = []; let m; TOK.lastIndex = 0; while ((m = TOK.exec(s || ''))) o.push(Number(m[1])); return o.join(','); };
const missing = [];
let ok = 0, same = 0, tok = 0, noUnits = 0;
for (const c of slice) {
  const L = landed.get(c.k);
  if (!L) { missing.push({ page: c.page, slug: c.slug, k: c.k, en: c.en }); continue; }
  if (!enByK.has(c.k)) { noUnits++; continue; }
  if (L.zh === c.en) { same++; continue; }
  if (seq(L.zh) !== seq(c.en)) { tok++; continue; }
  ok++;
}
fs.writeFileSync(outFile, JSON.stringify(missing, null, 1) + '\n', 'utf8');
console.log('range ' + start + '-' + (end - 1) + '  total=' + slice.length + '  landedOK=' + ok + '  stillMissing=' + missing.length +
  '  sameAsEnglish=' + same + '  tokenMismatch=' + tok + '  landedButNotInUnits=' + noUnits);
const bySlug = new Map();
for (const m of missing) bySlug.set(m.slug, (bySlug.get(m.slug) || 0) + 1);
const rows = [...bySlug.entries()].sort((a, b) => b[1] - a[1]);
for (const [s, n] of rows) console.log('   ' + String(n).padStart(4) + '  ' + s);
console.log('wrote ' + outFile);
