// Coverage per page + a priority queue of gameplay pages that are still mostly English.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';
import { Store } from './translate.mjs';

const store = new Store();
const pageUnits = readJson(path.join(DATA, 'page-units.json'), {});
const units = new Map(readJson(path.join(DATA, 'units.json'), []).map((u) => [u.k, u]));

const rows = [];
for (const [title, info] of Object.entries(pageUnits)) {
  let chars = 0, done = 0, n = 0;
  for (const k of info.units) {
    const u = units.get(k);
    if (!u) continue;
    n++; chars += u.en.length;
    if (store.get(u.en)) done += u.en.length;
  }
  rows.push({ title, slug: info.slug, units: n, chars, pct: chars ? done / chars : 1 });
}
rows.sort((a, b) => a.pct - b.pct || b.chars - a.chars);
const totalChars = rows.reduce((s, r) => s + r.chars, 0);
const doneChars = rows.reduce((s, r) => s + r.chars * r.pct, 0);
console.log(`pages=${rows.length} totalChars=${totalChars.toLocaleString()} translatedChars=${Math.round(doneChars).toLocaleString()} (${(100 * doneChars / totalChars).toFixed(1)}%)`);
console.log(`fully translated: ${rows.filter((r) => r.pct > 0.995).length} | >80%: ${rows.filter((r) => r.pct > 0.8).length} | <10%: ${rows.filter((r) => r.pct < 0.1).length}`);
console.log('\nbiggest untranslated pages (by chars still in English):');
for (const r of [...rows].sort((a, b) => b.chars * (1 - b.pct) - a.chars * (1 - a.pct)).slice(0, 30)) {
  console.log(`  ${(r.chars * (1 - r.pct)).toFixed(0).padStart(7)} chars left  ${(r.pct * 100).toFixed(0).padStart(3)}%  ${String(r.units).padStart(4)}u  ${r.title}`);
}
fs.writeFileSync(path.join(DATA, 'coverage-by-page.json'), JSON.stringify(rows, null, 0));
