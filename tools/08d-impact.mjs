// Rank untranslated units by TOTAL character impact across the whole site
// (english length x number of pages that show it). Surfaces shared boilerplate,
// where one translation pays off on hundreds of pages.
//   node tools/08d-impact.mjs [--top N] [--min-pages N]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';
import { Store } from './translate.mjs';

const argN = (name, dflt) => { const i = process.argv.indexOf(name); return i === -1 ? dflt : Number(process.argv[i + 1]); };
const top = argN('--top', 30);
const minPages = argN('--min-pages', 2);

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
    if (!s) { s = new Set(); where.set(en, s); }
    s.add(page);
  }
}

const rows = [];
for (const [en, pages] of where) {
  if (store.get(en)) continue;
  if (pages.size < minPages) continue;
  rows.push({ en, pages: pages.size, len: en.length, impact: en.length * pages.size, sample: [...pages].slice(0, 3) });
}
rows.sort((a, b) => b.impact - a.impact);
const totalImpact = rows.reduce((s, r) => s + r.impact, 0);
console.log(`shared untranslated units: ${rows.length}  total char-impact: ${totalImpact.toLocaleString()}`);
console.log(`top ${top} by impact (len x pages):\n`);
for (const r of rows.slice(0, top)) {
  const t = r.en.replace(/\s+/g, ' ');
  console.log(`${String(r.impact).padStart(7)}  ${String(r.pages).padStart(3)}p x ${String(r.len).padStart(4)}c  ${t.slice(0, 96)}`);
}
