// Per-page breakdown of the units newly exposed by the leaf-container fix, so translation can be
// driven page by page. Only genuine untranslated prose is counted.
import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse } from '../classify.mjs';
import { isStructuralResidue } from '../residue.mjs';

const oldU = JSON.parse(fs.readFileSync('data/units.pre-divfix.json', 'utf8'));
const newU = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const oldK = new Set(oldU.map((u) => u.k));
const newByK = new Map(newU.map((u) => [u.k, u]));
const st = new Store();

const added = newU.filter((u) => !oldK.has(u.k) && !st.has(u.en) && isTranslatableProse(u.en) && !isStructuralResidue(u.en));
const addK = new Set(added.map((u) => u.k));

const rows = [];
for (const [title, rec] of Object.entries(pageUnits)) {
  let n = 0, chars = 0;
  for (const k of rec.units) {
    if (!addK.has(k)) continue;
    n++; chars += newByK.get(k).len;
  }
  if (n) rows.push({ title, slug: rec.slug, n, chars });
}
rows.sort((a, b) => b.chars - a.chars);
const all = process.argv.includes('--all');
if (all) {
  fs.writeFileSync('tools/scratch/wave3-pages.txt', rows.map((r) => r.chars + '\t' + r.n + '\t' + r.title).join('\n') + '\n');
  console.log('wrote tools/scratch/wave3-pages.txt with ' + rows.length + ' pages');
}
console.log('pages affected=' + rows.length + '  new units=' + added.length + '  chars=' + added.reduce((s, u) => s + u.len, 0));
console.log('');
for (const r of rows.slice(0, 40)) {
  console.log(String(r.chars).padStart(6) + ' chars  x' + String(r.n).padStart(4) + '  ' + r.title);
}
console.log('');
console.log('remaining pages: ' + rows.slice(40).reduce((s, r) => s + r.chars, 0) + ' chars');
