// Two cleanups before the final merge:
//  1. Move the BULK.*.json working files out of data/pageblocks — they end in .zh.json and carry no
//     top-level "page", so 10-merge-pageblocks would try to read them as page blocks.
//  2. Drop items whose key is absent from units.json. The merge resolves a batch item's English via
//     its key; a key that is not in units.json can never be applied, so such items are dead weight
//     (agent H's chunk was written with 47 wrong keys).
// Restricts itself to *.w*.zh.json so the legacy batches (the known 47-failure baseline) are untouched.
//   node tools/scratch/prune-bad-keys.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from '../lib.mjs';

const dir = path.join(DATA, 'pageblocks');
const stash = path.join('tools', 'scratch', 'bulk');
fs.mkdirSync(stash, { recursive: true });

// 1. stash BULK working files
let moved = 0;
for (const f of fs.readdirSync(dir)) {
  if (/^BULK\..*\.json$/.test(f)) { fs.renameSync(path.join(dir, f), path.join(stash, f)); moved++; }
}
console.log('stashed BULK working files out of pageblocks: ' + moved);

// 2. prune dead keys
const valid = new Set(readJson(path.join(DATA, 'units.json'), []).map((u) => u.k));
let filesTouched = 0, dropped = 0, deleted = 0;
for (const f of fs.readdirSync(dir)) {
  if (!/\.w\d+.*\.zh\.json$/.test(f)) continue;
  const p = path.join(dir, f);
  let b;
  try { b = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { console.log('  unparseable, left alone: ' + f); continue; }
  const before = (b.items || []).length;
  const keep = (b.items || []).filter((it) => valid.has(it.k));
  if (keep.length === before) continue;
  dropped += before - keep.length;
  filesTouched++;
  console.log('  ' + f.padEnd(50) + ' dropped=' + (before - keep.length) + ' kept=' + keep.length);
  if (!keep.length) { fs.unlinkSync(p); deleted++; continue; }
  writeJson(p, { ...b, items: keep });
}
console.log('files changed=' + filesTouched + '  items dropped=' + dropped + '  files removed (now empty)=' + deleted);
