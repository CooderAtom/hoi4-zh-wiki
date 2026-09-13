// Assemble a batch from the uncovered-items list (_missing.json) + a { k: zh } map.
//   node tools/scratch/_buildmiss.mjs <N> <zhmaps.json...>
import fs from 'node:fs';
const N = Number(process.argv[2]);
const MAPS = process.argv.slice(3);
const dir = 'data/pageblocks';
const miss = JSON.parse(fs.readFileSync('tools/scratch/_missing.json', 'utf8'));
const slice = miss.slice((N - 1) * 50, N * 50);
const zh = new Map();
for (const m of MAPS) {
  const o = JSON.parse(fs.readFileSync(m, 'utf8'));
  for (const [k, v] of Object.entries(o)) {
    if (zh.has(k) && zh.get(k) !== v) { console.error('CONFLICT ' + k); process.exit(1); }
    zh.set(k, v);
  }
}
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const enByK = new Map(units.map((u) => [u.k, u.en]));
const TOK = /⟦\s*(\d+)\s*⟧/g;
const seq = (s) => { const o = []; let m; TOK.lastIndex = 0; while ((m = TOK.exec(s || ''))) o.push(Number(m[1])); return o.join(','); };
const out = [];
const problems = [];
for (const it of slice) {
  const z = zh.get(it.k);
  if (!z) { problems.push('NO ZH for ' + it.k); continue; }
  if (z === it.en || z === enByK.get(it.k)) problems.push('ZH EQUALS EN for ' + it.k);
  const en = enByK.get(it.k) ?? it.en;
  if (seq(en) !== seq(z)) problems.push('TOKEN ' + it.k + ' en[' + seq(en) + '] zh[' + seq(z) + ']');
  out.push({ page: it.page, slug: it.slug, k: it.k, zh: z });
}
// keep chunk staging OUT of data/pageblocks (the merger scans that dir for per-page batches)
const outDir = process.argv[2] === 'bulk' ? 'tools/scratch/bulk' : 'tools/scratch/bulk';
const file = outDir + '/BULK.miss.q' + N + '.zh.json';
fs.writeFileSync(file, JSON.stringify({ items: out }, null, 1) + '\n', 'utf8');
console.log('wrote ' + file + '  translated=' + out.length + '  sliceSize=' + slice.length + '  problems=' + problems.length);
for (const p of problems) console.log('  ' + p);
