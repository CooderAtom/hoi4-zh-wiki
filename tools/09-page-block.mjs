// Export one page's still-untranslated strings as compact, chunked translation blocks,
// so a page can be translated in a few digestible passes.
//   node tools/09-page-block.mjs "<Page title>" [--chunk 120]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';
import { Store } from './translate.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const page = process.argv[2];
const CHUNK = Number(arg('--chunk', 120));
if (!page) { console.error('usage: node tools/09-page-block.mjs "<Page>" [--chunk N]'); process.exit(1); }

const store = new Store();
const pageUnits = readJson(path.join(DATA, 'page-units.json'), {});
const info = pageUnits[page];
if (!info) { console.error('page not found:', page); process.exit(1); }
const units = new Map(readJson(path.join(DATA, 'units.json'), []).map((u) => [u.k, u]));

const pending = [];
for (const k of info.units) {
  const u = units.get(k);
  if (!u) continue;
  if (store.get(u.en)) continue;
  if (!/[\u4e00-\u9fff]/.test(store.get(u.en) || '')) { /* keep untranslated too */ }
  pending.push({ k, en: u.en });
}
const allChars = pending.reduce((s, u) => s + u.en.length, 0);
console.log(`page="${page}" units=${info.units.length} pending=${pending.length} chars=${allChars.toLocaleString()}`);

const outDir = path.join(DATA, 'pageblocks');
fs.mkdirSync(outDir, { recursive: true });
const safe = page.replace(/[^\w.-]+/g, '_').slice(0, 60);
const chunks = [];
for (let i = 0; i < pending.length; i += CHUNK) {
  const slice = pending.slice(i, i + CHUNK);
  const file = `${safe}.${String(chunks.length).padStart(2, '0')}.json`;
  writeJson(path.join(outDir, file), { page, chunk: chunks.length, items: slice });
  chunks.push({ file, items: slice.length, chars: slice.reduce((s, u) => s + u.en.length, 0) });
}
// translation template for the whole page
const tpl = { page, items: pending.map((u) => ({ k: u.k, en: u.en, zh: '' })) };
writeJson(path.join(outDir, `${safe}.template.json`), tpl);
console.log(`chunks: ${chunks.length} (${CHUNK} units each)`);
for (const c of chunks) console.log(`  ${c.file}  items=${c.items} chars=${c.chars}`);
console.log(`template: data\\pageblocks\\${safe}.template.json`);
