import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from '../lib.mjs';
import { Store, key } from '../translate.mjs';
import { isTranslatableProse } from '../classify.mjs';

const page = process.argv[2] || 'List of tank designers';
const rec = readJson(path.join(DATA, 'page-units.json'))[page];
const units = readJson(path.join(DATA, 'units.json'), []);
const byK = new Map(units.map((u) => [u.k, u.en]));
const store = new Store();

let n = 0;
for (const k of rec.units) {
  const en = byK.get(k);
  if (!en) { if (n++ < 6) console.log('NO-EN  ' + k); continue; }
  if (!isTranslatableProse(en)) continue;
  const got = store.get(en);
  if (!got && n++ < 6) {
    console.log('PENDING ' + k + '  key(en)=' + key(en));
    console.log('   en=' + JSON.stringify(en.slice(0, 90)));
  }
}
console.log('--- now simulate the Store.get on that exact en string ---');
for (const k of rec.units) {
  const en = byK.get(k);
  if (!en || !isTranslatableProse(en)) continue;
  if (!store.get(en)) {
    const kk = key(en);
    console.log('k=' + k + ' computedKey=' + kk);
    const tm = readJson(path.join(DATA, 'tm.json'));
    const probe = tm[kk] || (tm.entries && tm.entries[kk]);
    console.log('   tm has computedKey: ' + (probe ? 'YES ' + JSON.stringify(probe).slice(0, 70) : 'no'));
    const entry = tm[k];
    console.log('   tm has unit-key: ' + (entry ? 'YES ' + JSON.stringify(entry).slice(0, 70) : 'no'));
    break;
  }
}
