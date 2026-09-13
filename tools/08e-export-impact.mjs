// Export the highest-impact SHARED untranslated units (english length x page count) as a
// numbered translation block. Translating one of these improves every page that shows it.
//   node tools/08e-export-impact.mjs [--limit N] [--from N] [--min-pages N]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';
import { Store } from './translate.mjs';

const argN = (name, dflt) => { const i = process.argv.indexOf(name); return i === -1 ? dflt : Number(process.argv[i + 1]); };
const limit = argN('--limit', 120);
const from = argN('--from', 0);
const minPages = argN('--min-pages', 8);
// Cap the batch by English characters instead of item count: shared units range from
// 100-char effect lines to 7,000-char MIO blocks, so a char budget keeps batches safe.
const maxChars = argN('--max-chars', 3500);
// Units below this English length are almost always country names, ids or single words that are
// either already translated under another spelling or deliberately left alone; requiring real
// sentence substance keeps the batch to content that actually needs translating.
const minLen = argN('--min-len', 60);
// Units longer than this are giant auto-generated tables (e.g. a whole MIO research tree in one
// string); they are real work but must be handled on their own, so keep them out of normal batches.
const maxLen = argN('--max-len', 2000);
const order = process.argv.includes('--smallest-first') ? 'asc' : 'desc';

const pageUnits = readJson(path.join(DATA, 'page-units.json'));
const units = readJson(path.join(DATA, 'units.json'), []);
const byK = new Map(units.map((u) => [u.k, u.en]));
const store = new Store();

const where = new Map();
for (const [page, rec] of Object.entries(pageUnits)) {
  for (const k of rec.units) {
    const en = byK.get(k);
    if (!en) continue;
    let s = where.get(en);
    if (!s) { s = new Map(); where.set(en, s); }
    s.set(page, k);   // keep one representative key per page
  }
}

const rows = [];
const oversize = [];
for (const [en, pages] of where) {
  if (store.get(en)) continue;
  if (pages.size < minPages) continue;
  if (en.length < minLen) continue;
  if (en.length > maxLen) { oversize.push(en.length); continue; }
  rows.push({ en, k: [...pages.values()][0], pages, n: pages.size, impact: en.length * pages.size });
}
rows.sort((a, b) => b.impact - a.impact);

const dir = path.join(DATA, 'pageblocks');
const done = new Set();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.zh.json'))) {
  const b = readJson(path.join(dir, f));
  if (b && b.page === 'SHARED') for (const it of b.items) done.add(it.k);
}
let rest = rows.filter((r) => ![...r.pages.values()].some((k) => done.has(k)));
if (order === 'asc') rest = rest.slice().sort((a, b) => a.en.length - b.en.length || b.impact - a.impact);

// Character-budgeted slice: never split the batch just to hit `limit`.
const slice = [];
let used = 0;
for (const r of rest.slice(from)) {
  if (slice.length >= limit) break;
  if (slice.length && used + r.en.length > maxChars) break;
  slice.push(r); used += r.en.length;
  if (used >= maxChars) break;
} const safe = 'SHARED';
writeJson(path.join(dir, `${safe}.i${String(from).padStart(4, '0')}.json`), { page: 'SHARED', batch: `impact-${from}`, items: slice.map(({ k, en }) => ({ k, en })) });
console.log(`SHARED.i${String(from).padStart(4, '0')}.json: items=${slice.length} chars=${used} impact=${slice.reduce((s, i) => s + i.impact, 0).toLocaleString()}`);
console.log(`shared>=${minPages} pages pending=${rest.length}  order=${order}  batch capped at ${maxChars} chars`);
console.log(`oversize units held back (>${maxLen} chars): ${oversize.length}  total ${oversize.reduce((s, n) => s + n, 0).toLocaleString()} chars`);
