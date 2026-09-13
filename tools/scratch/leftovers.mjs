// Dump the leftover (untranslated) prose units for pages that are >=99% but not 100%,
// to characterise whether they are real gaps or structural residue (zh === en can never be stored).
import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse as isProse } from '../classify.mjs';

const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u]));
const store = new Store();

const targets = process.argv.slice(2);
for (const title of targets) {
  const rec = pageUnits[title];
  if (!rec) { console.log('\n### ' + title + ': NOT FOUND'); continue; }
  const row = rows.find((r) => r.title === title);
  const left = [];
  for (const k of rec.units) {
    const u = byK.get(k);
    if (!u) continue;
    if (!isProse(u.en)) continue;
    if (store.get(u.en)) continue;
    left.push(u.en);
  }
  console.log('\n### ' + title + '  (page pct ' + (row ? (row.pct * 100).toFixed(1) : '?') + '%, leftovers=' + left.length + ')');
  for (const en of left.slice(0, 10)) {
    const oneLine = en.replace(/\s+/g, ' ').slice(0, 110);
    console.log('    | ' + JSON.stringify(oneLine));
  }
  if (left.length > 10) console.log('    ... +' + (left.length - 10) + ' more');
}
