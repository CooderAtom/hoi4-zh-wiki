import fs from 'node:fs';
import path from 'node:path';
import { DATA } from '../lib.mjs';

const out = process.argv[2];
const zhPath = path.join(DATA, 'pageblocks', out);
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const byK = new Map(zh.items.map((it) => [it.k, it.zh]));
const missing = [];
const seenPages = new Set();
for (const f of fs.readdirSync(path.join(DATA, 'pageblocks')).filter((x) => x.endsWith('.pr0000.json'))) {
  const b = JSON.parse(fs.readFileSync(path.join(DATA, 'pageblocks', f), 'utf8'));
  seenPages.add(`${b.page}(${b.items.length})`);
  for (const it of b.items) if (!byK.has(it.k)) missing.push({ k: it.k, page: b.page, en: it.en });
}
console.log(`slices: ${[...seenPages].join(', ')}`);
console.log(`zh items: ${byK.size} | missing: ${missing.length}`);
for (const m of missing) console.log(`  ${m.k}  [${m.page}]  ${m.en.slice(0, 80)}`);
