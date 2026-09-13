import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse as isProse } from '../classify.mjs';
import { isStructuralResidue } from '../residue.mjs';

const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const store = new Store(JSON.parse(fs.readFileSync('data/tm.json', 'utf8')));
const byK = new Map(units.map((u) => [u.k, u.en]));
const rec = pageUnits['Console commands'];
const left = [];
for (const k of rec.units) {
  const en = byK.get(k);
  if (!en || !isProse(en) || store.get(en)) continue;
  left.push({ en, cls: isStructuralResidue(en) });
}
console.log('total leftovers=' + left.length + '  classifier says structural=' + left.filter((x) => x.cls).length);
for (const x of left) console.log((x.cls ? '  STRUCT ' : '  GENUINE') + ' | ' + JSON.stringify(x.en));
