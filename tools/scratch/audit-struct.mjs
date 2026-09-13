// Audit the newly-structural class for false positives: show structural leftovers whose shape
// is riskiest (exactly one pure-lowercase prose word, i.e. could be a short prose fragment).
import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse as isProse } from '../classify.mjs';
import { isStructuralResidue } from '../residue.mjs';

const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const store = new Store(JSON.parse(fs.readFileSync('data/tm.json', 'utf8')));
const byK = new Map(units.map((u) => [u.k, u.en]));

const risky = [];
let totalStruct = 0, totalStructChars = 0;
for (const [title, rec] of Object.entries(pageUnits)) {
  for (const k of rec.units) {
    const en = byK.get(k);
    if (!en || !isProse(en) || store.get(en) || !isStructuralResidue(en)) continue;
    totalStruct++; totalStructChars += en.length;
    const toks = en.replace(/\u27E6\d+\u27E7/g, ' ').trim().split(/\s+/);
    const prose = toks.filter((x) => /^[a-z]{3,}$/.test(x)).length;
    if (prose === 1) risky.push(title + ' | ' + JSON.stringify(en));
  }
}
console.log(`total structural=${totalStruct} units / ${totalStructChars.toLocaleString()} chars`);
console.log(`risky bucket (exactly 1 lowercase prose word)=${risky.length}`);
for (const r of risky.slice(0, 60)) console.log('  ' + r);
