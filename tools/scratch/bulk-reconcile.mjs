// Reconcile the BULK chunk files against what has already been split into per-page batches.
// For every BULK.*.zh.json chunk, find the items whose key is NOT yet present in any batch file,
// and write those out as proper per-page batches (same routing as bulk-split.mjs).
// Idempotent: re-running writes nothing once everything is in.
//   node tools/scratch/bulk-reconcile.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from '../lib.mjs';

const dir = path.join(DATA, 'pageblocks');
const all = fs.readdirSync(dir);

const present = new Set();
for (const f of all) {
  if (!/\.zh\.json$/.test(f) || /^BULK\./.test(f)) continue;
  try { for (const it of readJson(path.join(dir, f)).items || []) present.add(it.k); } catch { /* ignore */ }
}

function nextFree(slug) {
  let n = 1;
  for (;;) { if (!fs.existsSync(path.join(dir, slug + '.w' + String(n).padStart(2, '0') + '.zh.json'))) return n; n++; }
}

const chunks = all.filter((f) => /^BULK\..*\.zh\.json$/.test(f)).sort();
const byPage = new Map();
let missing = 0, already = 0;
for (const f of chunks) {
  let b;
  try { b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { console.log('SKIP unparseable ' + f); continue; }
  for (const it of b.items || []) {
    if (!it.k || !it.page || !it.slug || !it.zh) continue;
    if (present.has(it.k)) { already++; continue; }
    missing++;
    if (!byPage.has(it.page)) byPage.set(it.page, { slug: it.slug, items: [] });
    byPage.get(it.page).items.push({ k: it.k, zh: it.zh });
    present.add(it.k);   // guard against the same key in two chunks
  }
}
console.log('chunks=' + chunks.length + '  keys already in batches=' + already + '  keys needing a split=' + missing);

let files = 0;
for (const [page, rec] of byPage) {
  const batch = rec.slug + '.w' + String(nextFree(rec.slug)).padStart(2, '0');
  writeJson(path.join(dir, batch + '.zh.json'), { page, batch, items: rec.items });
  files++;
  console.log('  wrote ' + (batch + '.zh.json').padEnd(52) + ' items=' + rec.items.length);
}
console.log('new batch files=' + files);
