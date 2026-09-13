// Find items whose zh is "english + appended Chinese gloss" (pattern: zh starts with en).
// Those are the risky ones for code/identifier units, because they alter the literal text.
//   node tools/scratch/gloss-audit.mjs <file.zh.json> [max]
import fs from 'node:fs';
import path from 'node:path';
const file = path.join('data/pageblocks', path.basename(process.argv[2]));
const max = Number(process.argv[3] || 25);
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u.en]));
const hits = [];
for (const it of b.items) {
  const en = it.en !== undefined ? it.en : byK.get(it.k);
  if (!en) continue;
  if (it.zh !== en && it.zh.startsWith(en)) hits.push({ k: it.k, en, zh: it.zh });
}
console.log(file + ': items=' + b.items.length + '  gloss-appended items=' + hits.length);
for (const h of hits.slice(0, max)) {
  console.log('  [' + h.k + '] EN: ' + h.en.replace(/\n/g, ' ').slice(0, 130));
  console.log('          ZH: ' + h.zh.replace(/\n/g, ' ').slice(0, 170));
}
