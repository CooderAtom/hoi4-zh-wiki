// Anchor parity: sanitized source vs BUILT page, counted as totals per tag.
// Both sides come from the same pipeline (sanitize -> collectUnits -> applyTranslations -> build),
// so any page where the built total is LOWER than the sanitized source is markup my renderer lost.
// 99e-struct-vs-origin compares against the raw origin, where leftover wiki chrome inflates the
// reference; this compares like with like.
//   node tools/scratch/anchor-parity.mjs [--top 20]
import fs from 'node:fs';
import path from 'node:path';
import { parse, serialize } from '../dom.mjs';
import { CACHE, readJson } from '../lib.mjs';
import { parserOutput, sanitize, assignHeadingIds } from '../sanitize.mjs';

const top = Number((process.argv.indexOf('--top') >= 0 ? process.argv[process.argv.indexOf('--top') + 1] : 20));
const media = readJson(path.join('data', 'media.json'), { files: {} });
const images = new Map(Object.entries(media.files || {}));
const files = fs.readdirSync(path.join(CACHE, 'pages')).filter((f) => f.endsWith('.json'));
const knownSlugs = new Set(files.map((f) => f.replace(/\.json$/, '').toLowerCase()));
const TAGS = [['a', /<a\b[^>]*href=/g], ['img', /<img\b/g], ['li', /<li\b/g], ['ul', /<ul\b/g], ['table', /<table\b/g], ['td', /<td\b/g]];
const count = (s, re) => (s.match(re) || []).length;

let checked = 0, badPages = 0;
const rows = [];
for (const f of files) {
  const slug = f.replace(/\.json$/, '');
  const builtPath = 'site/' + slug + '.html';
  if (!fs.existsSync(builtPath)) continue;
  const rec = readJson(path.join(CACHE, 'pages', f));
  if (!rec?.html) continue;
  let src;
  try {
    const dom = parse(rec.html);
    const body = parserOutput(dom);
    sanitize(body, { images, pageTitle: rec.title, known: knownSlugs });
    assignHeadingIds(body);
    src = serialize(body);
  } catch { continue; }
  checked++;
  const built = fs.readFileSync(builtPath, 'utf8');
  const deltas = [];
  for (const [name, re] of TAGS) {
    const d = count(built, re) - count(src, re);
    if (d < 0) deltas.push(name + ' ' + d);
  }
  if (!deltas.length) continue;
  badPages++;
  rows.push({ slug, deltas });
}
console.log('pages compared=' + checked + '  pages with LESS markup than sanitized source=' + badPages);
console.log('');
for (const r of rows.slice(0, top)) console.log('  ' + r.slug.padEnd(42) + r.deltas.join('  '));
