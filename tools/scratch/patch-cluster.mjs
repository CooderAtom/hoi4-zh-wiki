// List the "Patch family" cluster: pages whose title starts with "Patch ".
// Reports current genuine remaining prose (translatable, non-structural, not yet in TM).
import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse as isProse } from '../classify.mjs';
import { isStructuralResidue } from '../residue.mjs';

const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u]));
const store = new Store();

const out = [];
for (const r of rows) {
  if (!/^Patch /.test(r.title)) continue;
  const rec = pageUnits[r.title];
  if (!rec) continue;
  let chars = 0, n = 0;
  const samples = [];
  for (const k of rec.units) {
    const u = byK.get(k);
    if (!u || !isProse(u.en) || store.get(u.en)) continue;
    if (isStructuralResidue(u.en)) continue;
    chars += u.en.length; n++;
    if (samples.length < 2) samples.push(u.en.replace(/\s+/g, ' ').slice(0, 100));
  }
  out.push({ title: r.title, chars, n, pct: r.pct, samples });
}
out.sort((a, b) => b.chars - a.chars);
const tc = out.reduce((s, x) => s + x.chars, 0);
const tn = out.reduce((s, x) => s + x.n, 0);
console.log('cluster B "patch family": pages=' + out.length + '  genuine remaining units=' + tn + '  chars=' + tc);
console.log('');
for (const o of out) {
  console.log(o.title.padEnd(30) + ' units=' + String(o.n).padStart(5) + '  chars=' + String(o.chars).padStart(6) + '  done=' + o.pct + '%');
}
console.log('');
console.log('--- first page samples ---');
for (const s of (out[0]?.samples || [])) console.log('  | ' + s);
