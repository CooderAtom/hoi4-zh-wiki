// Resolve cross-file duplicate keys that DISAGREE, so the merged result no longer depends on the
// order 10-merge happens to read the directory.
// Choice rule: the value from the file with the LATEST mtime wins (a later deliberate edit
// supersedes an earlier one), ties broken by filename. This is what preserves the `zfix` batches,
// which were later corrections - notably restoring wiki anchors such as `Land_battle#Combat_factors`
// that a translated form would have broken.
// All files that carry the key are then rewritten to that single value, so the batch corpus agrees
// with itself no matter what reads it.
//   node tools/scratch/fix-xfile-conflicts.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from '../lib.mjs';

const apply = process.argv.includes('--apply');
const dir = path.join(DATA, 'pageblocks');

const files = fs.readdirSync(dir).filter((f) => /\.zh\.json$/.test(f) && !/^BULK\./.test(f)).sort();
const cache = new Map();
const mtime = new Map();
for (const f of files) {
  try { cache.set(f, readJson(path.join(dir, f))); mtime.set(f, fs.statSync(path.join(dir, f)).mtimeMs); } catch { /* skip */ }
}

// page \0 key -> [{ file, index }]
const index = new Map();
for (const [f, b] of cache) {
  if (!b || !b.page || !Array.isArray(b.items)) continue;
  b.items.forEach((it, i) => {
    if (!it.k) return;
    const pk = b.page + '\u0000' + it.k;
    if (!index.has(pk)) index.set(pk, []);
    index.get(pk).push({ file: f, index: i });
  });
}

const score = (file) => mtime.get(file) || 0;   // later edit wins
const rewrites = [];   // [file, itemIndex, newZh, page, k]
let conflicts = 0;

for (const [pk, list] of index) {
  if (list.length < 2) continue;
  const [page, k] = pk.split('\u0000');
  const vals = list.map((x) => cache.get(x.file).items[x.index].zh);
  if (new Set(vals).size < 2) continue;
  conflicts++;
  let best = list[0];
  let bestScore = score(best.file);
  for (const cand of list.slice(1)) {
    const s = score(cand.file);
    if (s > bestScore || (s === bestScore && cand.file > best.file)) { best = cand; bestScore = s; }
  }
  const target = cache.get(best.file).items[best.index].zh;
  for (const x of list) {
    if (x.file === best.file && x.index === best.index) continue;
    rewrites.push([x.file, x.index, target, page, k]);
  }
}

console.log('conflicting (page,key) pairs = ' + conflicts + '  entries to rewrite = ' + rewrites.length + (apply ? '' : '   [DRY RUN — pass --apply]'));
for (const [f, i, t, page, k] of rewrites.slice(0, 8)) console.log('  ' + f + ' :: ' + page + ' :: ' + k + ' -> ' + String(t).slice(0, 46));

if (apply) {
  for (const [f, i, t] of rewrites) cache.get(f).items[i].zh = t;
  const touched = new Set(rewrites.map((r) => r[0]));
  for (const f of touched) writeJson(path.join(dir, f), cache.get(f));
  console.log('rewrote ' + touched.size + ' files');
}
