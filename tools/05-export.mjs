// Step 5a: export untranslated units as batch files for translation.
//   data/batches/batch-NNN.json  = { batch, units: [{k, en}] }
// usage: node tools/05-export.mjs [--max-chars 6000] [--max-units 120] [--priority]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';
import { Store, key } from './translate.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const MAX_CHARS = arg('--max-chars', 6000);
const MAX_UNITS = arg('--max-units', 120);
const BATCH_DIR = path.join(DATA, 'batches');
fs.mkdirSync(BATCH_DIR, { recursive: true });

const units = readJson(path.join(DATA, 'units.json'), []);
const pageUnits = readJson(path.join(DATA, 'page-units.json'), {});
const glossary = readJson(path.join(DATA, 'glossary.json'), {});
const store = new Store();
const todo = units.filter((u) => !store.has(u.en));
console.log('units total:', units.length, '| todo:', todo.length, '| already translated:', units.length - todo.length);

// group units by page so batches stay contextually coherent
const byPage = new Map();
const unitByKey = new Map(units.map((u) => [u.k, u]));
for (const [title, p] of Object.entries(pageUnits)) {
  byPage.set(title, p.units.filter((k) => { const u = unitByKey.get(k); return u && !store.has(u.en); }));
}

// priority order: core gameplay pages first, then the rest by page size
const PRIORITY = [
  "Beginner's guide", 'User interface', 'Mechanics', 'Hotkeys', 'Countries',
  'Government', 'Ideas', 'Officer corps', 'National focus', 'Research', 'Construction',
  'Production', 'Events', 'Diplomacy', 'Puppet', 'Occupation', 'World tension',
  'Intelligence agency', 'Trade', 'Warfare', 'Combat tactics', 'Logistics', 'Terrain',
  'Weather', 'Battle plan', 'Army planner', 'Command group', 'Division',
  'Land warfare', 'Naval warfare', 'Air warfare', 'Land units', 'Naval units', 'Air units',
  'Achievements', 'Console commands', 'Jargon', 'Downloadable content', 'Patches',
];
const rank = (t) => { const i = PRIORITY.indexOf(t); return i < 0 ? 999 : i; };
const pages = [...byPage.entries()]
  .filter(([, ks]) => ks.length)
  .sort((a, b) => (process.argv.includes('--priority') ? rank(a[0]) - rank(b[0]) || b[1].length - a[1].length : b[1].length - a[1].length));

const batches = [];
let cur = { units: [], chars: 0, pages: [] };
const flush = () => {
  if (!cur.units.length) return;
  batches.push(cur);
  cur = { units: [], chars: 0, pages: [] };
};
for (const [title, ks] of pages) {
  const us = ks.map((k) => unitByKey.get(k));
  const pageChars = us.reduce((s, u) => s + u.en.length, 0);
  if (pageChars > MAX_CHARS) {
    // a single huge page: chunk it
    flush();
    let chunk = { units: [], chars: 0, pages: [title] };
    for (const u of us) {
      if (chunk.chars + u.en.length > MAX_CHARS && chunk.units.length) { batches.push(chunk); chunk = { units: [], chars: 0, pages: [title] }; }
      chunk.units.push(u); chunk.chars += u.en.length;
    }
    if (chunk.units.length) batches.push(chunk);
    continue;
  }
  if ((cur.chars + pageChars > MAX_CHARS) || (cur.units.length + us.length > MAX_UNITS)) flush();
  cur.units.push(...us);
  cur.chars += pageChars;
  cur.pages.push(title);
}
flush();

// clear old batch files, write the new set
for (const f of fs.readdirSync(BATCH_DIR)) if (/^batch-\d+\.json$/.test(f)) fs.unlinkSync(path.join(BATCH_DIR, f));
const index = [];
batches.forEach((b, i) => {
  const name = `batch-${String(i + 1).padStart(3, '0')}.json`;
  writeJson(path.join(BATCH_DIR, name), {
    batch: i + 1,
    pages: b.pages,
    chars: b.chars,
    glossary,
    instructions: 'Translate every "en" string into Simplified Chinese (zh-Hans), game-guide register. Follow glossary.json strictly. Keep ⟦0⟧-style placeholders, numbers, units and wiki markup exactly. Return only {"items":[{"k":"...","zh":"..."}]} with the same k values.',
    units: b.units.map((u) => ({ k: u.k, en: u.en, ...(u.frags ? { frags: u.frags } : {}) })),
  });
  index.push({ batch: i + 1, file: name, pages: b.pages, units: b.units.length, chars: b.chars });
});
writeJson(path.join(DATA, 'batch-index.json'), index);
const summary = path.join(DATA, 'BATCHES.md');
fs.writeFileSync(summary, '# Translation batches\n\n' + index.map((b) =>
  `- ${b.file}  units=${b.units}  chars=${b.chars}  pages: ${b.pages.slice(0, 6).join(', ')}${b.pages.length > 6 ? ` … (+${b.pages.length - 6})` : ''}`).join('\n') + '\n');
console.log('batches:', batches.length, '| total chars:', batches.reduce((s, b) => s + b.chars, 0).toLocaleString());
console.log('index written to data/batch-index.json and data/BATCHES.md');
console.log('first 6 batches:');
index.slice(0, 6).forEach((b) => console.log(`  ${b.file} ${String(b.units).padStart(4)} units ${String(b.chars).padStart(6)} chars  ${b.pages.slice(0, 4).join(' | ')}`));
