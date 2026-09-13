// Audit one page: unit extraction, sanitization results, link/media integrity.
// usage: node tools/99-audit.mjs "Government" [--quiet]
import { parse, serialize, $, byTag, $1 } from './dom.mjs';
import { parserOutput, sanitize, assignHeadingIds } from './sanitize.mjs';
import { collectUnits, uniqueUnits } from './units.mjs';
import { DATA, CACHE, readJson } from './lib.mjs';
import path from 'node:path';
import { slug } from './lib.mjs';

const title = process.argv[2] || 'Government';
const rec = readJson(path.join(CACHE, 'pages', slug(title) + '.json'));
if (!rec) { console.error('not cached:', title); process.exit(1); }

const dom = parse(rec.html);
const body = parserOutput(dom);
const stats = sanitize(body, { images: new Map(), pageTitle: title });
const toc = assignHeadingIds(body);
const units = uniqueUnits(collectUnits(body));

const html = serialize(body);
const imgs = byTag(body, 'img');
const links = byTag(body, 'a');
const internal = links.filter((a) => a.attr('data-wiki-title'));
const anchors = links.filter((a) => (a.attr('href') || '').startsWith('#'));
const external = links.filter((a) => /^https?:/.test(a.attr('href') || ''));
const noHref = links.filter((a) => !a.attr('href'));
const scripts = byTag(body, 'script').length + byTag(body, 'style').length;
const videos = byClassCount(body, 'embedvideo');

function byClassCount(root, cls) { let n = 0; for (const e of root.descendants()) if (e.hasClass(cls)) n++; return n; }

console.log(`=== ${title} ===`);
console.log('sanitize stats :', JSON.stringify(stats));
console.log('toc entries    :', toc.length);
console.log('units (unique) :', units.length, '| chars:', units.reduce((s, u) => s + u.src.length, 0).toLocaleString());
console.log('elements       :', body.descendants().length, '| out bytes:', html.length);
console.log('images kept    :', imgs.length, '| videos left:', videos, '| script/style:', scripts);
console.log('links: internal', internal.length, 'anchor', anchors.length, 'external', external.length, 'no-href', noHref.length);
console.log('depths: max section level', Math.max(...toc.map((t) => t.level)));
const badImgs = imgs.filter((i) => !i.attr('src') || !i.attr('src').startsWith('images/'));
console.log('bad <img> src  :', badImgs.length, badImgs.slice(0, 3).map((i) => i.attr('src')));

if (!process.argv.includes('--quiet')) {
  console.log('\n--- first 25 units ---');
  units.slice(0, 25).forEach((u, i) => {
    console.log(`${String(i).padStart(3)} [${u.ctx}] frags=${u.fragments.length} ${JSON.stringify(u.src.slice(0, 150))}`);
  });
  console.log('\n--- longest 5 units ---');
  units.slice().sort((a, b) => b.src.length - a.src.length).slice(0, 5).forEach((u) =>
    console.log(`  ${u.src.length}c frags=${u.fragments.length}: ${u.src.slice(0, 120)}`));
  console.log('\n--- h2 sections ---');
  byTag(body, 'h2').forEach((h) => console.log('  #' + h.attr('id'), '|', h.textContent.trim().slice(0, 60)));
}
