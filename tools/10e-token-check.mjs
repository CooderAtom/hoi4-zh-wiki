// Verify a translation block's placeholder tokens against the English source BEFORE merging.
// This is the check that actually matters: 10-merge-pageblocks rejects a block unless the token
// SEQUENCE is identical, not merely ascending. An ascending-only check misses dropped or added
// tokens (that exact mistake cost a full batch-rewrite in round 36).
//   node tools/10e-token-check.mjs <block.zh.json> [...]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';

const TOK = /\u27E6\d+\u27E7/g;
const seq = (s) => (String(s).match(TOK) || []).map((t) => t.replace(/[^\d]/g, '')).join(',');

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node tools/10e-token-check.mjs <block.zh.json> [...]'); process.exit(1); }

const dir = path.join(DATA, 'pageblocks');
const byK = new Map(readJson(path.join(DATA, 'units.json'), []).map((u) => [u.k, u.en]));
// Reverse index so a block that carries its own `en` also resolves.
const byEn = new Map();
for (const [k, en] of byK) if (!byEn.has(en)) byEn.set(en, k);

let bad = 0, checked = 0;
for (const f of files) {
  const b = readJson(path.join(dir, path.basename(f)));
  for (const it of b.items || []) {
    const en = it.en || byK.get(it.k);
    if (!en) { console.log(`  ${path.basename(f)} ${it.k}: NO ENGLISH (stale key?)`); bad++; continue; }
    const a = seq(en), z = seq(it.zh);
    checked++;
    if (a !== z) {
      bad++;
      const ac = a ? a.split(',') : [], zc = z ? z.split(',') : [];
      const missing = ac.filter((t) => !zc.includes(t));
      const extra = zc.filter((t) => !ac.includes(t));
      console.log(`  ${path.basename(f)} ${it.k}: TOKEN MISMATCH`);
      console.log(`    en(${ac.length}): ${a || '(none)'}`);
      console.log(`    zh(${zc.length}): ${z || '(none)'}`);
      if (missing.length) console.log(`    missing: ${missing.join(',')}`);
      if (extra.length) console.log(`    extra  : ${extra.join(',')}`);
    }
  }
}
console.log(bad ? `FAIL: ${bad} of ${checked} items have token mismatches` : `ok: ${checked} items, all token sequences identical`);
process.exitCode = bad ? 1 : 0;
