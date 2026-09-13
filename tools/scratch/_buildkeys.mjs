// Build a chunk file from an explicit key list (order preserved) + a { k: zh } map.
//   node tools/scratch/_buildkeys.mjs <outName> <keylist.json> <zhmaps.json...>
// keylist.json = [ "k1", "k2", ... ]  or  { "keys": [...] }
import fs from 'node:fs';
const outName = process.argv[2];
const keyArg = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const keys = Array.isArray(keyArg) ? keyArg : keyArg.keys;
const MAPS = process.argv.slice(4);
const miss = JSON.parse(fs.readFileSync('tools/scratch/_missing.json', 'utf8'));
const canon = JSON.parse(fs.readFileSync('tools/scratch/bulk/BULK.ALL.json', 'utf8')).items;
const byK = new Map([...canon, ...miss].map((m) => [m.k, m]));
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
for (const k of keys) {
  const it = byK.get(k);
  if (!it) { problems.push('NOT IN MISSING LIST: ' + k); continue; }
  const z = zh.get(k);
  if (!z) { problems.push('NO ZH for ' + k); continue; }
  if (z === it.en || z === enByK.get(k)) problems.push('ZH EQUALS EN for ' + k);
  const en = enByK.get(k) ?? it.en;
  if (seq(en) !== seq(z)) problems.push('TOKEN ' + k + ' en[' + seq(en) + '] zh[' + seq(z) + ']');
  out.push({ page: it.page, slug: it.slug, k, zh: z });
}
const file = 'tools/scratch/bulk/' + outName;
fs.writeFileSync(file, JSON.stringify({ items: out }, null, 1) + '\n', 'utf8');
console.log('wrote ' + file + '  translated=' + out.length + '  requested=' + keys.length + '  problems=' + problems.length);
for (const p of problems) console.log('  ' + p);
