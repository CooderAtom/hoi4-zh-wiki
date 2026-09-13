// Export the untranslated PROSE units of a page as a numbered translation block,
// largest-first so the biggest wins come early. Code identifiers are skipped.
//   node tools/10d-export-prose.mjs Faction [--limit N] [--from N]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';
import { Store } from './translate.mjs';
import { isTranslatableProse } from './classify.mjs';

const page = process.argv[2];
if (!page) { console.error('usage: node tools/10d-export-prose.mjs <page> [--limit N] [--from N]'); process.exit(1); }
const argN = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? dflt : Number(process.argv[i + 1]);
};
const limit = argN('--limit', 130);
const from = argN('--from', 0);

const rec = readJson(path.join(DATA, 'page-units.json'))[page];
if (!rec) { console.error('no page-units entry for:', page); process.exit(1); }
const units = readJson(path.join(DATA, 'units.json'), []);
const byK = new Map(units.map((u) => [u.k, u.en]));
const store = new Store();

const pending = [];
for (const k of rec.units) {
  const en = byK.get(k);
  if (!en || !isTranslatableProse(en) || store.get(en)) continue;
  pending.push({ k, en, n: en.length });
}
pending.sort((a, b) => b.n - a.n);

// Skip units already exported in a previous block for this page.
const safe = page.replace(/[^\w.-]+/g, '_').slice(0, 60);
const dir = path.join(DATA, 'pageblocks');
const done = new Set();
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
  if (!/\.zh\.json$/.test(f)) continue;
  const b = readJson(path.join(dir, f));
  if (b && b.page === page) for (const it of b.items) done.add(it.k);
}
const rest = pending.filter((p) => !done.has(p.k));
const slice = rest.slice(from, from + limit).map(({ k, en }) => ({ k, en }));

const out = { page, batch: `prose-${from}`, items: slice };
writeJson(path.join(dir, `${safe}.pr${String(from).padStart(4, '0')}.json`), out);
console.log(`${safe}.pr${String(from).padStart(4, '0')}.json: items=${slice.length} chars=${slice.reduce((s, i) => s + i.en.length, 0)}`);
console.log(`page=${page}: prose pending=${rest.length} units / ${rest.reduce((s, p) => s + p.n, 0)} chars (already in blocks: ${done.size}; remaining after this slice: ${Math.max(0, rest.length - from - limit)})`);
