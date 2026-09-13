// Show the highest-frequency untranslated short strings, so a shared glossary can
// be written by hand for the labels that repeat across hundreds of pages.
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';
import { Store } from './translate.mjs';

const store = new Store();
const units = readJson(path.join(DATA, 'units.json'), []);
const todo = units.filter((u) => !store.get(u.en) && u.en.length <= 60 && /[A-Za-z]/.test(u.en));
todo.sort((a, b) => (b.pages || 0) - (a.pages || 0) || a.en.localeCompare(b.en));
console.log('candidates:', todo.length);
for (const u of todo.slice(0, Number(process.argv[2] || 260))) {
  console.log(`${String(u.pages).padStart(4)}x  ${JSON.stringify(u.en)}`);
}
