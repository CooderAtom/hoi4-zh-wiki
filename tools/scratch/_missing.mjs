// Which keys of my 400-item range are NOT yet in any landed *.zh.json (excluding my own staging files)?
import fs from 'node:fs';
const dir = 'data/pageblocks';
const all = JSON.parse(fs.readFileSync('tools/scratch/bulk/BULK.ALL.json', 'utf8')).items.slice(0, 400);
const landed = new Set();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json') && !f.startsWith('BULK.all.f.'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) landed.add(it.k);
}
const missing = all.filter((c) => !landed.has(c.k));
console.log('range=400 alreadyLanded=' + (400 - missing.length) + ' stillMissing=' + missing.length);
const bySlug = new Map();
for (const m of missing) {
  if (!bySlug.has(m.slug)) bySlug.set(m.slug, []);
  bySlug.get(m.slug).push(m.k);
}
for (const [s, ks] of bySlug) console.log('  ' + s.padEnd(34) + ' ' + ks.length);
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const enByK = new Map(units.map((u) => [u.k, u.en]));
const noEn = missing.filter((m) => !enByK.has(m.k));
console.log('missing-but-not-in-units.json=' + noEn.length + (noEn.length ? ' ' + noEn.map((x) => x.k).join(' ') : ''));
fs.writeFileSync('tools/scratch/_missing.json', JSON.stringify(missing.map((m) => ({ page: m.page, slug: m.slug, k: m.k, en: m.en })), null, 1) + '\n', 'utf8');
console.log('wrote tools/scratch/_missing.json');
