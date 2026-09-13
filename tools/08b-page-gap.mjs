// List the untranslated PROSE units of a page (excluding code identifiers), largest first.
//   node tools/08b-page-gap.mjs Modifiers [--top N]
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';
import { Store } from './translate.mjs';
import { isTranslatableProse } from './classify.mjs';
const page = process.argv[2];
if (!page) { console.error('usage: node tools/08b-page-gap.mjs <page> [--top N]'); process.exit(1); }
const ti = process.argv.indexOf('--top');
const top = ti === -1 ? 25 : Number(process.argv[ti + 1]);

const pageUnits = readJson(path.join(DATA, 'page-units.json'))[page];
if (!pageUnits) { console.error('no page-units entry for:', page); process.exit(1); }
const byK = new Map(readJson(path.join(DATA, 'units.json'), []).map((u) => [u.k, u.en]));
const store = new Store();

// Keep only translatable prose (drops code identifiers, math markup and template diagnostics).
const isProse = isTranslatableProse;

const missing = [];
for (const k of pageUnits.units) {
  const en = byK.get(k);
  if (!en || !isProse(en) || store.get(en)) continue;
  missing.push([en.length, k, en]);
}
missing.sort((a, b) => b[0] - a[0]);
console.log(`page=${page} untranslated prose units=${missing.length} chars=${missing.reduce((s, m) => s + m[0], 0)}`);
for (const [n, k, en] of missing.slice(0, top)) console.log(`### ${k}\n${en}\n`);
