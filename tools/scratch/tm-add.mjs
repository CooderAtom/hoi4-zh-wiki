// Persist translations from fix maps into the translation memory (data/tm.json), so a future
// rebuild of the site keeps them instead of reverting to English.
// usage: node tools/scratch/tm-add.mjs data/work/fix-A.json data/work/fix-B.json ...
import fs from 'node:fs';
import { Store, key, normalize } from '../translate.mjs';

const store = new Store();
const before = store.size;

let added = 0, noop = 0, skipped = 0;
const report = [];
for (const f of process.argv.slice(2)) {
  const map = JSON.parse(fs.readFileSync(f, 'utf8'));
  let a = 0, n = 0, s = 0;
  for (const item of map.items || []) {
    const en = normalize(item.en);
    const zh = String(item.zh ?? '').trim();
    if (!en || !zh || zh === en) { s++; continue; }
    if (store.set(en, zh)) { a++; added++; } else { n++; noop++; }
  }
  report.push(`  ${f}: +${a} set, ${n} already-current, ${s} skipped`);
}
const written = store.flush();
console.log('fix maps processed:');
for (const r of report) console.log(r);
console.log(`\ntm entries: ${before} -> ${store.size}  (flush wrote ${written} changed keys)`);
