// How much of the untranslated corpus is formulaic? (stat lines, equipment modifiers,
// "X: +N%" patterns) — these can be translated by rules instead of by hand.
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';
import { Store } from './translate.mjs';

const store = new Store();
const units = readJson(path.join(DATA, 'units.json'), []);
const todo = units.filter((u) => !store.get(u.en));

const isFormula = (s) =>
  s.length <= 200 &&
  /[+\-–]\s?\d|\d+(?:\.\d+)?\s?%|:/.test(s) &&          // carries numbers/percent/colon
  !/[.!?]\s+[A-Z]/.test(s) &&                            // not several sentences
  !/\b(?:the|and|that|with|from|which|would|should|because|however|therefore)\b/i.test(s.replace(/^[^:]{0,24}:/, ''));

const bands = {};
let fUnits = 0, fChars = 0;
for (const u of todo) {
  if (isFormula(u.en)) { fUnits++; fChars += u.en.length; }
}
console.log(`todo units=${todo.length} chars=${todo.reduce((s, u) => s + u.en.length, 0).toLocaleString()}`);
console.log(`formulaic candidates: units=${fUnits} chars=${fChars.toLocaleString()} (${(100 * fChars / todo.reduce((s, u) => s + u.en.length, 0)).toFixed(1)}% of remaining chars)`);

// how many distinct "shapes" do they share?
const shape = (s) => s.replace(/[-\d.]+/g, 'N').replace(/⟦\d+⟧/g, 'T').replace(/[A-Za-z][A-Za-z'’\- ]+/g, 'W');
const shapes = new Map();
for (const u of todo) {
  if (!isFormula(u.en)) continue;
  const k = shape(u.en);
  const e = shapes.get(k) || { n: 0, chars: 0, ex: u.en };
  e.n++; e.chars += u.en.length; shapes.set(k, e);
}
const top = [...shapes.entries()].sort((a, b) => b[1].n - a[1].n);
console.log(`distinct formula shapes: ${top.length}`);
console.log('top shapes:');
for (const [k, v] of top.slice(0, 25)) console.log(`  ${String(v.n).padStart(5)}x ${String(v.chars).padStart(8)}ch  ${JSON.stringify(v.ex).slice(0, 90)}`);
let acc = 0, n = 0;
for (const [, v] of top) { acc += v.chars; n++; if (n >= 200) break; }
console.log(`\ntop 200 shapes cover ${acc.toLocaleString()} chars of the ${fChars.toLocaleString()} formulaic total`);
