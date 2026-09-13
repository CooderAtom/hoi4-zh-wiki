// List items in given pageblocks .zh.json files whose zh is byte-identical to the English
// (merge stores nothing for these, so the coverage checker still counts them as untranslated).
//   node tools/scratch/noops.mjs <file.zh.json> [...]
//   node tools/scratch/noops.mjs --recent        (every *.zh.json modified in the last 3 hours)
import fs from 'node:fs';
import path from 'node:path';
const dir = 'data/pageblocks';
let files = process.argv.slice(2);
if (files[0] === '--recent') {
  const cut = Date.now() - 3 * 3600 * 1000;
  files = fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'))
    .filter((f) => fs.statSync(path.join(dir, f)).mtimeMs > cut);
}
let total = 0;
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u.en]));
for (const f of files) {
  const b = JSON.parse(fs.readFileSync(path.join(dir, path.basename(f)), 'utf8'));
  const bad = (b.items || []).filter((it) => {
    const en = it.en !== undefined ? it.en : byK.get(it.k);
    return en === undefined ? false : (it.zh === en || !it.zh || it.zh.trim() === '');
  });
  if (!bad.length) continue;
  console.log('=== ' + path.basename(f) + ' (' + b.page + ') no-op items=' + bad.length);
  for (const it of bad) console.log('  ' + it.k + ' :: ' + JSON.stringify(it.zh));
  total += bad.length;
}
console.log('total no-op items=' + total);
