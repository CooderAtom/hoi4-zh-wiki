// Build the next chunk of uncovered items by re-deriving coverage LIVE from data/pageblocks,
// so it is always correct no matter how many times _rangemiss.json is refreshed.
//   node tools/scratch/_nextchunk.mjs <map.json...>
// Also writes the batch-name manifest so the page is never double-split.
import fs from 'node:fs';
const MAPS = process.argv.slice(2);
const dir = 'data/pageblocks';
const landed = new Set();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) landed.add(it.k);
}
const canon = JSON.parse(fs.readFileSync('tools/scratch/bulk/BULK.ALL.json', 'utf8')).items;
const span = canon.slice(400, 1342);
const remaining = span.filter((c) => !landed.has(c.k));
const slice = remaining.slice(0, 50);
const zh = new Map();
for (const m of MAPS) {
  const o = JSON.parse(fs.readFileSync(m, 'utf8'));
  for (const [k, v] of Object.entries(o)) zh.set(k, v);
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
const CUR = 'tools/scratch/_curseq.json';
const cur = fs.existsSync(CUR) ? JSON.parse(fs.readFileSync(CUR, 'utf8')) : 0;
if (problems.length) {
  // Hard stop: do not emit or advance anything when any item is unresolved, so a partial/stale
  // chunk can never reach data/pageblocks.
  console.log('ABORTED (no file written, cursor unchanged at ' + cur + '): ' + problems.length + ' problem(s)');
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
const file = 'tools/scratch/bulk/BULK.range.q' + (cur + 1) + '.zh.json';
fs.writeFileSync(file, JSON.stringify({ items: out }, null, 1) + '\n', 'utf8');
fs.writeFileSync(CUR, JSON.stringify(cur + 1) + '\n', 'utf8');
{
  const man = fs.existsSync('tools/scratch/_batches.json') ? JSON.parse(fs.readFileSync('tools/scratch/_batches.json', 'utf8')) : {};
  for (const o of out) { if (!man[o.slug]) man[o.slug] = []; if (!man[o.slug].includes(o.k)) man[o.slug].push(o.k); }
  fs.writeFileSync('tools/scratch/_batches.json', JSON.stringify(man, null, 1) + '\n', 'utf8');
}
console.log('wrote ' + file + '  translated=' + out.length + '  remainingSpan=' + remaining.length + '  problems=0');
