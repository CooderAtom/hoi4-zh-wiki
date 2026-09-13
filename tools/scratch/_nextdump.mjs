// Dump the NEXT uncovered slice from the live span (skipping empty entries), so its key list always
// matches what _nextchunk.mjs will build.
import fs from 'node:fs';
const dir = 'data/pageblocks';
const landed = new Set();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) landed.add(it.k);
}
const canon = JSON.parse(fs.readFileSync('tools/scratch/bulk/BULK.ALL.json', 'utf8')).items;
const remaining = canon.slice(400, 1342).filter((c) => !landed.has(c.k));
const skip = Number(process.argv[2] || 0);
const slice = remaining.slice(skip, skip + 50);
console.log('# remainingSpan=' + remaining.length + '  showing=' + slice.length);
console.log(JSON.stringify(slice.map((c) => c.k)));
for (const c of slice) console.log(c.slug + '\t' + c.k + '\t' + c.en);
