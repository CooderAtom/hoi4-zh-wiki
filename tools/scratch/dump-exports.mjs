// Print every pending .pr*.json export (key, en length, token sequence, English) for review.
//   node tools/scratch/dump-exports.mjs
import fs from 'node:fs';
import path from 'node:path';
const DIR = 'data/pageblocks';
const RE = /\u27E6(\d+)\u27E7/g;
const files = fs.readdirSync(DIR).filter((f) => /\.pr\d+\.json$/.test(f));
if (!files.length) { console.log('no pending exports'); process.exit(0); }
for (const f of files) {
  const b = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  console.log(`=== ${f}  page=${b.page}  items=${b.items.length}`);
  for (const it of b.items) {
    const seq = [...it.en.matchAll(RE)].map((m) => m[1]).join(',');
    console.log(`${it.k} (${it.en.length}) [${seq}] :: ${String(it.en).replace(/\n/g, ' ')}`);
  }
}
