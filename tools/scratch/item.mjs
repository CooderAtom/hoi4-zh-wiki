// Show one item from a pageblocks .zh.json, or list items whose token order differs from English.
//   node tools/scratch/item.mjs <file.zh.json> <key>
//   node tools/scratch/item.mjs <file.zh.json> --bad
import fs from 'node:fs';
import path from 'node:path';
const dir = 'data/pageblocks';
const file = path.join(dir, path.basename(process.argv[2]));
const arg = process.argv[3];
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u.en]));
const TOK = /\u27E6\d+\u27E7/g;
const seq = (s) => (String(s).match(TOK) || []).map((t) => t.replace(/[^\d]/g, '')).join(',');
if (arg === '--bad') {
  for (const it of b.items) {
    const en = it.en || byK.get(it.k);
    if (!en) { console.log('NO ENGLISH ' + it.k); continue; }
    if (seq(en) !== seq(it.zh)) console.log(it.k + '\n  en: ' + en.replace(/\n/g, ' ') + '\n  zh: ' + it.zh.replace(/\n/g, ' '));
  }
} else {
  const it = b.items.find((x) => x.k === arg);
  if (!it) { console.log('no such key: ' + arg); process.exit(0); }
  console.log('k=' + it.k);
  console.log('EN: ' + (it.en || byK.get(it.k)));
  console.log('ZH: ' + it.zh);
  console.log('seqEn=' + seq(it.en || byK.get(it.k)) + '  seqZh=' + seq(it.zh));
}
