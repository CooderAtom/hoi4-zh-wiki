// How much of the Patch cluster is duplicate text across pages? Duplicates cost nothing extra
// once the first occurrence is translated (TM is keyed by English), so this is the real work size.
import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse as isProse } from '../classify.mjs';
import { isStructuralResidue } from '../residue.mjs';

const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u]));
const store = new Store();
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const count = new Map();
let total = 0, chars = 0;
for (const r of rows) {
  if (!/^Patch /.test(r.title)) continue;
  const rec = pageUnits[r.title];
  if (!rec) continue;
  const seenInPage = new Set();
  for (const k of rec.units) {
    const u = byK.get(k);
    if (!u || !isProse(u.en) || store.get(u.en) || isStructuralResidue(u.en)) continue;
    total++; chars += u.en.length;
    const key = norm(u.en);
    if (seenInPage.has(key)) continue;
    seenInPage.add(key);
    count.set(key, (count.get(key) || 0) + 1);
  }
}
const unique = count.size;
let dupChars = 0, dupUnits = 0;
for (const [en, n] of count) {
  if (n > 1) { dupUnits += n - 1; dupChars += (n - 1) * en.length; }
}
console.log('patch cluster remaining: units=' + total + ' chars=' + chars);
console.log('DISTINCT english strings=' + unique + '  (so ' + (total - unique) + ' units are repeats of another patch unit)');
console.log('chars recoverable from cross-page dedup=' + dupChars + '  (' + (100 * dupChars / chars).toFixed(1) + '% of cluster)');
console.log('=> effective NEW strings to translate: ' + unique + ' / ' + (chars - dupChars) + ' chars');
console.log('');
console.log('--- most repeated strings ---');
for (const [en, n] of [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log('  x' + String(n).padStart(3) + '  ' + en.slice(0, 95));
}
