// Compare the unit set before/after the leaf-container fix.
import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse } from '../classify.mjs';
import { isStructuralResidue } from '../residue.mjs';

const oldU = JSON.parse(fs.readFileSync('data/units.pre-divfix.json', 'utf8'));
const newU = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const st = new Store();
const oldK = new Set(oldU.map((u) => u.k));
const newK = new Set(newU.map((u) => u.k));
const added = newU.filter((u) => !oldK.has(u.k));
const removed = oldU.filter((u) => !newK.has(u.k));
const sum = (a) => a.reduce((s, u) => s + u.len, 0);
console.log('unique units : ' + oldU.length.toLocaleString() + ' -> ' + newU.length.toLocaleString() + '  (+' + added.length + ', -' + removed.length + ')');
console.log('unique chars : ' + sum(oldU).toLocaleString() + ' -> ' + sum(newU).toLocaleString());

const addTr = added.filter((u) => st.has(u.en));
const addProse = added.filter((u) => !st.has(u.en) && isTranslatableProse(u.en) && !isStructuralResidue(u.en));
console.log('');
console.log('NEW keys                     : ' + added.length + '  (' + sum(added).toLocaleString() + ' chars)');
console.log('  ...already translated in TM: ' + addTr.length + '  (' + sum(addTr).toLocaleString() + ' chars)  <- free, just needs renderer');
const rest = added.filter((u) => !st.has(u.en));
console.log('  ...still untranslated      : ' + rest.length + '  (' + sum(rest).toLocaleString() + ' chars)');
console.log('     of which genuine prose  : ' + addProse.length + '  (' + sum(addProse).toLocaleString() + ' chars)');
console.log('     of which structural/code: ' + (rest.length - addProse.length) + '  (' + (sum(rest) - sum(addProse)).toLocaleString() + ' chars)');
const byCtx = {};
for (const u of addProse) { const c = (u.ctx || '').split(':')[0]; byCtx[c] = (byCtx[c] || 0) + 1; }
console.log('     genuine-prose by kind   : ' + JSON.stringify(byCtx));
console.log('');
console.log('--- sample of the new genuine prose ---');
for (const u of addProse.slice().sort((a, b) => b.len - a.len).slice(0, 10)) {
  console.log('  [' + u.ctx + '] ' + u.en.replace(/\s+/g, ' ').slice(0, 120));
}
