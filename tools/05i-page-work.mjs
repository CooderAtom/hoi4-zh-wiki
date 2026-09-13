// Per-page translation work list: for each page, which batches still need translating.
// usage: node tools/05i-page-work.mjs [topN]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';
import { Store } from './translate.mjs';

const store = new Store();
const idx = readJson(path.join(DATA, 'batch-index.json'), []);
const units = readJson(path.join(DATA, 'units.json'), []);
const byK = new Map(units.map((u) => [u.k, u]));

// untranslated chars per batch
const batches = [];
for (const b of idx) {
  const file = b.file;
  const zhFile = file.replace(/\.json$/, '.zh.json');
  if (fs.existsSync(path.join(DATA, 'batches', zhFile))) continue;
  const body = readJson(path.join(DATA, 'batches', file), { units: [] });
  let chars = 0, n = 0;
  for (const u of body.units || []) {
    if (store.get(u.en)) continue;
    chars += u.en.length; n++;
  }
  if (!n) continue;
  batches.push({ file, batch: b.batch, pages: b.pages, units: n, chars });
}

const byPage = new Map();
for (const b of batches) {
  for (const p of b.pages || ['(unknown)']) {
    const e = byPage.get(p) || { page: p, chars: 0, units: 0, batches: [] };
    e.chars += b.chars; e.units += b.units; e.batches.push(b.file);
    byPage.set(p, e);
  }
}
const rows = [...byPage.values()].sort((a, b) => b.chars - a.chars);
const topN = Number(process.argv[2] || 40);
console.log(`pages with pending work: ${rows.length} | pending batches: ${batches.length} | pending chars: ${batches.reduce((s, b) => s + b.chars, 0).toLocaleString()}`);
console.log(`\ntop ${topN} pages by untranslated chars:`);
for (const r of rows.slice(0, topN)) {
  console.log(`  ${String(r.chars).padStart(7)}ch ${String(r.units).padStart(5)}u ${String(r.batches.length).padStart(3)}b  ${r.page}`);
}
writeJson(path.join(DATA, 'page-work.json'), rows);
// ship the per-page batch lists for the top pages so an agent can be pointed at one page
writeJson(path.join(DATA, 'page-work-top.json'), rows.slice(0, topN));
