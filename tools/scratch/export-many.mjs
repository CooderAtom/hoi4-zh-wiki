// Export the remaining prose of many small pages into one combined slice file, so a single round can
// finish a whole band of near-complete pages.
//   node tools/scratch/export-many.mjs out.pr0000.json "Page A" "Page B" ...
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from '../lib.mjs';
import { Store } from '../translate.mjs';
import { isTranslatableProse } from '../classify.mjs';

const out = process.argv[2];
const pages = process.argv.slice(3);
const pageUnits = readJson(path.join(DATA, 'page-units.json'));
const byK = new Map(readJson(path.join(DATA, 'units.json'), []).map((u) => [u.k, u.en]));
const store = new Store();

const items = [];
const seen = new Set();
for (const page of pages) {
  const rec = pageUnits[page];
  if (!rec) { console.log(`  ! no page-units for ${page}`); continue; }
  for (const k of rec.units) {
    if (seen.has(k)) continue;
    const en = byK.get(k);
    if (!en || !isTranslatableProse(en) || store.get(en)) continue;
    seen.add(k);
    items.push({ k, en, page });
  }
}
items.sort((a, b) => b.en.length - a.en.length);
writeJson(path.join(DATA, 'pageblocks', out), { page: 'multi', batch: out, items: items.map(({ k, en }) => ({ k, en })) });
const byPage = {};
for (const it of items) byPage[it.page] = (byPage[it.page] || 0) + 1;
console.log(`${out}: items=${items.length} chars=${items.reduce((s, i) => s + i.en.length, 0)}`);
console.log('pages: ' + Object.entries(byPage).map(([p, n]) => `${p}(${n})`).join(', '));
