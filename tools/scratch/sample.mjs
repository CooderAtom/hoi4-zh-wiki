// Print a spread of items from a batch file with EN and ZH side by side, for quality spot-checks.
//   node tools/scratch/sample.mjs <file.zh.json> [count]
import fs from 'node:fs';
import path from 'node:path';
const dir = 'data/pageblocks';
const f = path.join(dir, path.basename(process.argv[2]));
const n = Number(process.argv[3] || 8);
const b = JSON.parse(fs.readFileSync(f, 'utf8'));
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u.en]));
const step = Math.max(1, Math.floor(b.items.length / n));
let shown = 0;
for (let i = 0; i < b.items.length && shown < n; i += step, shown++) {
  const it = b.items[i];
  const en = it.en !== undefined ? it.en : byK.get(it.k);
  console.log('[' + it.k + '] EN: ' + String(en).replace(/\n/g, ' ').slice(0, 230));
  console.log('        ZH: ' + String(it.zh).replace(/\n/g, ' ').slice(0, 230));
  console.log('');
}
