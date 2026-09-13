// Classify every no-op item (zh === en) across all pageblocks by isStructuralResidue.
// Prints per-page counts and a sample of the NON-structural ones (genuinely stuck translatable units).
import fs from 'node:fs';
import path from 'node:path';
import { isStructuralResidue } from '../residue.mjs';
const dir = 'data/pageblocks';
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u.en]));
const struct = [];
const real = [];
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.zh.json'))) {
  let b;
  try { b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
  for (const it of b.items || []) {
    const en = it.en !== undefined ? it.en : byK.get(it.k);
    if (en === undefined || it.zh !== en) continue;
    (isStructuralResidue(en) ? struct : real).push({ f, k: it.k, en });
  }
}
console.log('structural no-ops=' + struct.length + '   NON-structural (real stuck prose)=' + real.length);
const byPage = new Map();
for (const r of real) {
  const p = path.basename(r.f);
  byPage.set(p, (byPage.get(p) || 0) + 1);
}
console.log('--- non-structural no-ops per file ---');
for (const [p, n] of [...byPage.entries()].sort((a, b) => b[1] - a[1])) console.log('  ' + n + '  ' + p);
console.log('--- sample (up to 80) ---');
for (const r of real.slice(0, 80)) console.log('  ' + path.basename(r.f) + ' ' + r.k + ' :: ' + JSON.stringify(r.en).slice(0, 110));
