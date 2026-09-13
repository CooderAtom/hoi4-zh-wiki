// Revert specific keys in a pageblocks .zh.json back to byte-identical English, so that code/paths
// inside <code> stay copyable. A no-op value is correct here: merge refuses to store it, so the
// rendered page keeps the original English identifier.
//   node tools/scratch/revert-keys.mjs <file.zh.json> <key> [key...]
import fs from 'node:fs';
import path from 'node:path';
const file = path.join('data/pageblocks', path.basename(process.argv[2]));
const keys = new Set(process.argv.slice(3));
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u.en]));
let n = 0;
for (const it of b.items) {
  if (!keys.has(it.k)) continue;
  const en = it.en !== undefined ? it.en : byK.get(it.k);
  if (en === undefined) { console.log('no english for ' + it.k); continue; }
  it.zh = en;
  n++;
}
fs.writeFileSync(file, JSON.stringify(b, null, 1) + '\n');
console.log(file + ': reverted ' + n + ' keys to identity');
