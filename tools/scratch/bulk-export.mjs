// Bulk-export the pending PROSE of MANY pages into ONE translation file.
//
// The per-page exporter (10d) needs one export + one batch file per page, which is wasteful for the
// long tail of pages that have only a handful of units each. This gathers them into a single file:
//   { "items": [ { "page": "<Exact Title>", "slug": "<Slug>", "k": "...", "en": "..." } ] }
// Translate `zh` into the matching `.zh.json` (same shape, `en` replaced by `zh`) and then run
// bulk-split.mjs, which writes one normal pageblocks batch per page.
//
//   node tools/scratch/bulk-export.mjs <pagesFile> [maxItems]
//   pagesFile: one line per page, page title in the LAST tab-separated column.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from '../lib.mjs';
import { Store } from '../translate.mjs';
import { isTranslatableProse } from '../classify.mjs';
import { isStructuralResidue } from '../residue.mjs';

const pagesFile = process.argv[2] || 'tools/scratch/wave3-pages.txt';
const maxItems = Number(process.argv[3] || 130);
const perPage = Number(process.argv[4] || 12);
const outName = process.argv[5] || 'BULK.pending.json';
const skip = Number(process.argv[6] || 0);
const pageUnits = readJson(path.join(DATA, 'page-units.json'));
const units = readJson(path.join(DATA, 'units.json'), []);
const byK = new Map(units.map((u) => [u.k, u.en]));
const store = new Store();
const dir = path.join(DATA, 'pageblocks');

// Restrict to units newly exposed by the extractor fixes. Without this the exporter would pull the
// site's entire pre-existing backlog (4.7M chars) instead of the tail this task is about.
const basePath = path.join(DATA, 'units.pre-divfix.json');
const baseline = new Set(fs.existsSync(basePath) ? readJson(basePath, []).map((u) => u.k) : []);

const titles = fs.readFileSync(pagesFile, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
  .map((l) => l.split('\t').pop());

// "already exported" set, per page, exactly as 10d computes it
const doneByPage = new Map();
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
  if (!/\.zh\.json$/.test(f)) continue;
  const b = readJson(path.join(dir, f));
  if (!b || !b.page || !Array.isArray(b.items)) continue;
  if (!doneByPage.has(b.page)) doneByPage.set(b.page, new Set());
  for (const it of b.items) doneByPage.get(b.page).add(it.k);
}

const items = [];
const report = [];
let skipped = 0;
// Translation memory is keyed by English, so a unit shared by 100 pages only has to be translated
// once. Count it on the first page that takes it and skip it everywhere else, otherwise the export
// inflates the work by counting one string once per page.
const seen = new Set();
for (const title of titles) {
  const rec = pageUnits[title];
  if (!rec) { report.push([title, 0, 0, 'NO page-units entry']); continue; }
  const done = doneByPage.get(title) || new Set();
  let pend = 0, pendChars = 0, taken = 0;
  const rows = [];
  for (const k of rec.units) {
    const en = byK.get(k);
    if (!en || !isTranslatableProse(en) || store.get(en)) continue;
    if (isStructuralResidue(en)) continue;         // code/identifiers: correct to leave English
    if (baseline.has(k)) continue;                 // pre-existing backlog, not this task's tail
    pend++; pendChars += en.length;
    if (!done.has(k)) rows.push({ k, en, n: en.length });
  }
  rows.sort((a, b) => b.n - a.n);
  for (const r of rows) {
    if (items.length >= maxItems || taken >= perPage) break;
    if (seen.has(r.k)) continue;
    if (skipped < skip) { skipped++; continue; }
    seen.add(r.k);
    items.push({ page: title, slug: rec.slug, k: r.k, en: r.en });
    taken++;
  }
  report.push([title, pend, pendChars, 'took ' + taken]);
  if (items.length >= maxItems) break;
}
const outPath = path.join(dir, outName);
writeJson(outPath, { items });
console.log('bulk export: items=' + items.length + ' chars=' + items.reduce((s, i) => s + i.en.length, 0) + ' pages=' + new Set(items.map((i) => i.page)).size);
console.log('wrote ' + outPath);
console.log('');
for (const [t, p, c, note] of report.slice(0, 25)) console.log('  ' + String(p).padStart(5) + ' units ' + String(c).padStart(7) + ' chars  ' + t.padEnd(40) + note);
if (report.length > 25) console.log('  ... and ' + (report.length - 25) + ' more pages');
