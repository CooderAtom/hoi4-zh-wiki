// Rank untranslated SHORT units (<=60 chars) by total page reach, regardless of how many pages
// share them. These are the single-term cells inside MIO/manufacturer tables: one translation
// lands on ~100 pages. 08e-export-impact requires >=2 pages and sorts by len*pages; this focuses
// purely on reach so the widest-reaching terms come first.
//   node tools/08h-export-terms.mjs [--limit N] [--max-len N] [--min-pages N] [--max-chars N]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';
import { Store } from './translate.mjs';
import { isTranslatableProse } from './classify.mjs';

const argN = (n, d) => { const i = process.argv.indexOf(n); return i === -1 ? d : Number(process.argv[i + 1]); };
const limit = argN('--limit', 60);
const maxLen = argN('--max-len', 60);
const minPages = argN('--min-pages', 20);
const maxChars = argN('--max-chars', 2600);

const units = readJson(path.join(DATA, 'units.json'), []);
const store = new Store();
const rows = units
  .filter((u) => (u.pages || 0) >= minPages && u.en.length <= maxLen)
  .filter((u) => !store.get(u.en))
  .filter((u) => isTranslatableProse(u.en))
  .map((u) => ({ k: u.k, en: u.en, pages: u.pages || 0, reach: (u.pages || 0) * u.en.length }))
  .sort((a, b) => b.reach - a.reach);

const dir = path.join(DATA, 'pageblocks');
const done = new Set();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.zh.json'))) {
  const b = readJson(path.join(dir, f));
  if (b && b.page === 'TERMS') for (const it of b.items) done.add(it.k);
}
const rest = rows.filter((r) => !done.has(r.k));
const slice = [];
let used = 0;
for (const r of rest) {
  if (slice.length >= limit) break;
  if (slice.length && used + r.en.length > maxChars) break;
  slice.push(r); used += r.en.length;
}
writeJson(path.join(dir, 'TERMS.t0000.json'), { page: 'TERMS', batch: 'terms-0', items: slice.map(({ k, en }) => ({ k, en })) });
console.log(`TERMS.t0000.json: items=${slice.length} chars=${used} reach=${slice.reduce((s, i) => s + i.reach, 0).toLocaleString()}`);
console.log(`pending terms (>=${minPages} pages, <=${maxLen} chars): ${rest.length}`);
console.log(`total reach still available: ${rest.reduce((s, r) => s + r.reach, 0).toLocaleString()}`);
