// Diagnose the extractor on one page: which strings from the sanitized source never become units?
//   node tools/scratch/diag-page.mjs <slug> ["<needle>"]
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../dom.mjs';
import { CACHE, readJson } from '../lib.mjs';
import { parserOutput, sanitize, assignHeadingIds } from '../sanitize.mjs';
import { collectUnits, uniqueUnits, hasBlockContent, translatable } from '../units.mjs';

const slug = process.argv[2];
const needle = process.argv[3] || null;
const media = readJson(path.join('data', 'media.json'), { files: {} });
const images = new Map(Object.entries(media.files || {}));
const files = fs.readdirSync(path.join(CACHE, 'pages')).filter((f) => f.endsWith('.json'));
const knownSlugs = new Set(files.map((f) => f.replace(/\.json$/, '').toLowerCase()));

const rec = readJson(path.join(CACHE, 'pages', slug + '.json'));
const dom = parse(rec.html);
const body = parserOutput(dom);
sanitize(body, { images, pageTitle: rec.title, known: knownSlugs });
assignHeadingIds(body);
const units = uniqueUnits(collectUnits(body));
console.log('page=' + rec.title + '  units=' + units.length);

if (needle) {
  const hit = units.find((u) => u.src.includes(needle));
  console.log('needle in a unit? ' + (hit ? 'YES  ctx=' + hit.ctx : 'NO'));
  const el = body.descendants().find((e) => e.children && e.children.some((c) => c.type === 3 && c.data.includes(needle)));
  if (el) {
    console.log('element carrying the text: <' + el.name + ' class="' + (el.attr('class') || '') + '">  hasBlockContent=' + hasBlockContent(el));
    // tokenize-equivalent view of this element
    const u2 = units.find((u) => u.ctx && u.ctx.endsWith(':' + el.name) && u.src.includes(needle));
    console.log('registered under that element: ' + (u2 ? 'yes' : 'no'));
  } else {
    console.log('element not found (text may be in an attribute or split across nodes)');
  }
}

// How many text nodes on the page carry Latin text that no unit covers?
let missed = 0, missedChars = 0;
const covered = units.map((u) => u.src);
for (const e of body.descendants()) {
  for (const c of e.children || []) {
    if (c.type !== 3) continue;
    const d = c.data.trim();
    if (d.length < 12) continue;
    if (!/[A-Za-z]{3,}/.test(d)) continue;
    if (covered.some((s) => s.includes(d))) continue;
    missed++; missedChars += d.length;
    if (missed <= 8) console.log('  UNCOVERED <' + e.name + '> : ' + d.replace(/\s+/g, ' ').slice(0, 120));
  }
}
console.log('text nodes with latin text not covered by any unit: ' + missed + '  chars=' + missedChars);
