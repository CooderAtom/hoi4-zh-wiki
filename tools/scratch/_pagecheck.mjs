import fs from 'node:fs';
const slug = process.argv[2];
const canon = JSON.parse(fs.readFileSync('tools/scratch/bulk/BULK.ALL.json', 'utf8')).items.slice(0, 400);
const dir = 'data/pageblocks';
const landed = new Map();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) if (!landed.has(it.k)) landed.set(it.k, it.zh);
}
const TOK = /⟦\s*(\d+)\s*⟧/g;
const seq = (s) => { const o = []; let m; TOK.lastIndex = 0; while ((m = TOK.exec(s || ''))) o.push(Number(m[1])); return o.join(','); };
const rows = canon.filter((c) => c.slug === slug);
console.log(slug + ': ' + rows.length + ' items in my range');
for (const r of rows) {
  const z = landed.get(r.k);
  const ok = z ? (z === r.en ? 'SAME-EN' : (seq(z) === seq(r.en) ? 'ok' : 'TOKEN!')) : 'MISSING';
  console.log('  ' + ok.padEnd(7) + ' ' + r.k + '  ' + (z ? z.slice(0, 90) : r.en.slice(0, 90)));
}
