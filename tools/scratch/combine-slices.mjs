// Merge several per-page prose export slices into one combined zh block, so a single round can
// finish the tail of several near-complete pages. Each source slice has its own "page" field; the
// merged block keeps the items but records the pages it covers.
//   node tools/scratch/combine-slices.mjs out.b##.zh.json <slice...>
import fs from 'node:fs';
import path from 'node:path';
import { DATA } from '../lib.mjs';

const out = process.argv[2];
const slices = process.argv.slice(3);
const zhPath = path.join(DATA, 'pageblocks', out);
const zh = fs.existsSync(zhPath) ? JSON.parse(fs.readFileSync(zhPath, 'utf8')) : null;
const byK = new Map((zh?.items || []).map((it) => [it.k, it.zh]));

const pages = new Set();
const missing = [];
for (const s of slices) {
  const b = JSON.parse(fs.readFileSync(path.join(DATA, 'pageblocks', s), 'utf8'));
  pages.add(b.page);
  for (const it of b.items) {
    if (!byK.has(it.k)) missing.push({ k: it.k, en: it.en, page: b.page });
  }
}
console.log(`slices=${slices.length} pages=${[...pages].join(', ')}`);
console.log(`items in zh block: ${byK.size} | missing translations: ${missing.length}`);
for (const m of missing) console.log(`  ${m.k}  [${m.page}]  ${m.en.slice(0, 90)}`);
