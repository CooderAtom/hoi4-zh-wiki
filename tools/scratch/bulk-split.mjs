// Split a translated BULK file back into normal per-page batch files.
//   node tools/scratch/bulk-split.mjs <BULK.<something>.zh.json>
// Input shape: { "items": [ { "page", "slug", "k", "zh" } ] }
// Writes data/pageblocks/<Slug>.w<NN>.zh.json with batch "<Slug>.w<NN>", choosing the next free NN.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from '../lib.mjs';

const inPath = process.argv[2];
if (!inPath) { console.error('usage: node tools/scratch/bulk-split.mjs <BULK.*.zh.json>'); process.exit(1); }
const dir = path.join(DATA, 'pageblocks');
const src = readJson(inPath);
if (!src || !Array.isArray(src.items)) { console.error('bad input: no items array'); process.exit(1); }

// next free w-number per slug, from what is already on disk
function nextFree(slug) {
  let n = 1;
  for (;;) {
    const name = slug + '.w' + String(n).padStart(2, '0') + '.zh.json';
    if (!fs.existsSync(path.join(dir, name))) return n;
    n++;
  }
}

const byPage = new Map();
for (const it of src.items) {
  if (!it.page || !it.slug || !it.k) { console.error('item missing page/slug/k'); process.exit(1); }
  if (typeof it.zh !== 'string' || !it.zh.trim()) { console.error('item ' + it.k + ' has no zh'); process.exit(1); }
  if (!byPage.has(it.page)) byPage.set(it.page, { slug: it.slug, items: [] });
  byPage.get(it.page).items.push({ k: it.k, zh: it.zh });
}

let files = 0, items = 0;
for (const [page, rec] of byPage) {
  const n = nextFree(rec.slug);
  const batch = rec.slug + '.w' + String(n).padStart(2, '0');
  const name = batch + '.zh.json';
  writeJson(path.join(dir, name), { page, batch, items: rec.items });
  files++; items += rec.items.length;
  console.log('  ' + name.padEnd(52) + ' items=' + rec.items.length);
}
console.log('split: files=' + files + '  items=' + items + '  pages=' + byPage.size);
