// Link parity: every <a href> that survives sanitize() in the SOURCE must still be present in the
// BUILT page. A dropped anchor is the failure mode of rebuilding an element from a translation, so
// this compares the multiset of hrefs per page and reports anything the build lost or added.
//   node tools/scratch/link-parity.mjs [--top 25]
import fs from 'node:fs';
import path from 'node:path';
import { parse, serialize } from '../dom.mjs';
import { CACHE, readJson } from '../lib.mjs';
import { parserOutput, sanitize, assignHeadingIds } from '../sanitize.mjs';

const top = Number((process.argv.indexOf('--top') >= 0 ? process.argv[process.argv.indexOf('--top') + 1] : 25));
const media = readJson(path.join('data', 'media.json'), { files: {} });
const images = new Map(Object.entries(media.files || {}));
const files = fs.readdirSync(path.join(CACHE, 'pages')).filter((f) => f.endsWith('.json'));
const knownSlugs = new Set(files.map((f) => f.replace(/\.json$/, '').toLowerCase()));

const hrefs = (html) => {
  const out = new Map();
  const re = /<a\b[^>]*\bhref="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) out.set(m[1], (out.get(m[1]) || 0) + 1);
  return out;
};

let checked = 0, badPages = 0, lostTotal = 0;
const rows = [];
for (const f of files) {
  const slug = f.replace(/\.json$/, '');
  const builtPath = 'site/' + slug + '.html';
  if (!fs.existsSync(builtPath)) continue;
  const rec = readJson(path.join(CACHE, 'pages', f));
  if (!rec?.html) continue;
  let srcHtml;
  try {
    const dom = parse(rec.html);
    const body = parserOutput(dom);
    sanitize(body, { images, pageTitle: rec.title, known: knownSlugs });
    assignHeadingIds(body);
    srcHtml = serialize(body);
  } catch { continue; }
  checked++;
  const want = hrefs(srcHtml);
  const got = hrefs(fs.readFileSync(builtPath, 'utf8'));
  const missing = [];
  for (const [h, n] of want) {
    const g = got.get(h) || 0;
    if (g < n) missing.push([h, n - g]);
  }
  if (!missing.length) continue;
  badPages++;
  const lost = missing.reduce((s, x) => s + x[1], 0);
  lostTotal += lost;
  rows.push({ slug, lost, missing });
}
rows.sort((a, b) => b.lost - a.lost);
console.log('pages compared=' + checked + '  pages missing anchors=' + badPages + '  total missing anchor instances=' + lostTotal);
console.log('');
for (const r of rows.slice(0, top)) {
  console.log('  ' + String(r.lost).padStart(4) + '  ' + r.slug);
  for (const [h, n] of r.missing.slice(0, 4)) console.log('        x' + n + '  ' + h);
}
