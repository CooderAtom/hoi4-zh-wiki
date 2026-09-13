// Breakdown of what is still untranslated, by length band and context kind.
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';
import { Store } from './translate.mjs';

const store = new Store();
const units = readJson(path.join(DATA, 'units.json'), []);
const todo = units.filter((u) => !store.get(u.en));
const bands = { '<=20': 0, '21-40': 0, '41-80': 0, '81-160': 0, '161-320': 0, '>320': 0 };
const bandChars = { ...bands };
const byCtx = {};
const ctxChars = {};
for (const u of todo) {
  const L = u.en.length;
  const b = L <= 20 ? '<=20' : L <= 40 ? '21-40' : L <= 80 ? '41-80' : L <= 160 ? '81-160' : L <= 320 ? '161-320' : '>320';
  bands[b]++; bandChars[b] += L;
  const c = String(u.ctx || 'unknown').split(':')[0];
  byCtx[c] = (byCtx[c] || 0) + 1; ctxChars[c] = (ctxChars[c] || 0) + L;
}
console.log('untranslated units:', todo.length, 'chars:', todo.reduce((s, u) => s + u.en.length, 0).toLocaleString());
console.log('\nby length band:');
for (const [b, n] of Object.entries(bands)) console.log(`  ${b.padStart(8)}  units=${String(n).padStart(6)}  chars=${bandChars[b].toLocaleString().padStart(10)}`);
console.log('\nby context kind:');
for (const [c, n] of Object.entries(byCtx).sort((a, b) => ctxChars[b[0]] - ctxChars[a[0]])) {
  console.log(`  ${c.padEnd(20)} units=${String(n).padStart(6)}  chars=${ctxChars[c].toLocaleString().padStart(10)}`);
}
// how many units carry no letters at all (identifiers) -> nothing to translate
const noLetters = todo.filter((u) => !/[A-Za-z]/.test(u.en));
console.log('\nidentifier-only units still in todo:', noLetters.length, noLetters.reduce((s, u) => s + u.en.length, 0).toLocaleString(), 'chars');
