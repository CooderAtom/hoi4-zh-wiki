// Overlap guard: for chunk N of my range, report any of its keys that already exist in a landed
// *.zh.json in data/pageblocks (excluding my own BULK.all.f.* staging files).
import fs from 'node:fs';
const N = Number(process.argv[2]);
const dir = 'data/pageblocks';
const all = JSON.parse(fs.readFileSync('tools/scratch/bulk/BULK.ALL.json', 'utf8')).items.slice(0, 400);
const chunk = all.slice((N - 1) * 50, N * 50);
const landed = new Map();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json') && !f.startsWith('BULK.all.f.'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) if (!landed.has(it.k)) landed.set(it.k, f);
}
const hits = chunk.filter((c) => landed.has(c.k)).map((c) => c.k + ':' + landed.get(c.k));
console.log('chunk ' + N + ' size=' + chunk.length + ' alreadyLanded=' + hits.length);
if (hits.length) console.log('  ' + hits.join(' '));
