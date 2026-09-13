// Pick the best-value hub landing pages to translate: many short units beats few giant ones.
import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse as isProse } from '../classify.mjs';
import { isStructuralResidue } from '../residue.mjs';
import { HUBS } from '../registry.mjs';

const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const cov = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byTitle = new Map(cov.map((r) => [r.title, r]));
const ALIAS = JSON.parse(fs.readFileSync('data/redirect-aliases.json', 'utf8')).aliases || {};
const store = new Store(JSON.parse(fs.readFileSync('data/tm.json', 'utf8')));
const byK = new Map(units.map((u) => [u.k, u.en]));

const seen = new Set();
const out = [];
for (const hub of HUBS) {
  for (const [title] of hub.items) {
    const r = byTitle.get(title) || byTitle.get(ALIAS[title]);
    if (!r || seen.has(r.title)) continue;
    seen.add(r.title);
    const rec = pageUnits[r.title];
    if (!rec) continue;
    let chars = 0, n = 0, maxLen = 0;
    for (const k of rec.units) {
      const en = byK.get(k);
      if (!en || !isProse(en) || store.get(en) || isStructuralResidue(en)) continue;
      chars += en.length; n++; maxLen = Math.max(maxLen, en.length);
    }
    if (n > 0) out.push({ title: r.title, hub: hub.zh || hub.title, n, chars, avg: Math.round(chars / n), maxLen, pct: r.pct });
  }
}
out.sort((a, b) => b.chars - a.chars);
console.log('pages=' + out.length + '  total units=' + out.reduce((s, r) => s + r.n, 0) + '  total chars=' + out.reduce((s, r) => s + r.chars, 0).toLocaleString());
console.log('title'.padEnd(34) + 'hub'.padEnd(12) + 'units'.padStart(6) + 'chars'.padStart(9) + 'avg'.padStart(6) + 'max'.padStart(6) + 'pct'.padStart(7) + '  batches');
for (const r of out) {
  console.log(r.title.padEnd(34) + (r.hub || '').padEnd(12) + String(r.n).padStart(6) + r.chars.toLocaleString().padStart(9)
    + String(r.avg).padStart(6) + String(r.maxLen).padStart(6) + (r.pct * 100).toFixed(1).padStart(7) + String(Math.ceil(r.n / 130)).padStart(9));
}
