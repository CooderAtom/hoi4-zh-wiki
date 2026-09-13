// Find translation units whose ORIGINAL English contains Chinese characters.
// Such a unit is poisoned: `cache/pages/*.json` is the immutable English scrape, so any CJK in
// those units came from a bad round-trip where an already-translated page was re-scraped and
// stored as the English source. Its English key is junk, and the rendered output mixes languages
// ("The main sources for air intel are the target country's 执政党's <a>意识形态</a>").
//   node tools/scratch/poisoned-units.mjs [--limit N]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson } from '../lib.mjs';
import { parse } from '../dom.mjs';
import { parserOutput } from '../sanitize.mjs';
import { collectUnits } from '../units.mjs';

const limit = Number((process.argv.find((a) => a.startsWith('--limit')) || '').split('=')[1] || 0) || Infinity;
const CACHE_PAGES = path.join(ROOT, 'cache', 'pages');
const CJK = /[\u4e00-\u9fff]/;

const files = fs.readdirSync(CACHE_PAGES).filter((f) => f.endsWith('.json'));
const bad = [];
let scanned = 0, units = 0;

for (const f of files) {
  const rec = readJson(path.join(CACHE_PAGES, f));
  if (!rec?.html) continue;
  scanned++;
  let body;
  try {
    const dom = parse(rec.html);
    body = parserOutput(dom);
  } catch { continue; }
  let us = [];
  try { us = collectUnits(body); } catch { continue; }
  for (const u of us) {
    units++;
    if (!CJK.test(u.src)) continue;
    // ignore the handful of legitimately-CJK strings in the English wiki (Japanese/Chinese names)
    bad.push({ page: rec.title || f.replace(/\.json$/, ''), key: null, len: u.src.length, src: u.src });
  }
}

// Group by page.
const byPage = new Map();
for (const b of bad) {
  if (!byPage.has(b.page)) byPage.set(b.page, []);
  byPage.get(b.page).push(b);
}
const ranked = [...byPage.entries()].sort((a, b) => b[1].length - a[1].length);

console.log(`scanned ${scanned} origin pages, ${units.toLocaleString()} units`);
console.log(`units containing CJK in their ENGLISH source: ${bad.length.toLocaleString()} across ${byPage.size} pages\n`);
for (const [page, list] of ranked.slice(0, limit === Infinity ? 25 : limit)) {
  console.log(`${String(list.length).padStart(5)}  ${page}`);
}
console.log('\n--- samples ---');
for (const b of bad.slice(0, 8)) console.log(`[${b.page}] ${b.src.replace(/\s+/g, ' ').slice(0, 170)}`);
