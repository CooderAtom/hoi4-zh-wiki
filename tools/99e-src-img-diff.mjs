// Find images present in the raw cached wiki HTML but absent from the rendered Chinese page.
//   node tools/99e-src-img-diff.mjs [--top N]
import fs from 'node:fs';
import path from 'node:path';
import { CACHE, SITE, readJson } from './lib.mjs';

const ti = process.argv.indexOf('--top');
const top = ti === -1 ? 40 : Number(process.argv[ti + 1]);

const srcDir = path.join(CACHE, 'pages');
// Normalize any image reference to a comparable key:
//  - thumb.php?f=Foo.png&width=22  -> Foo.png
//  - /images/thumb/a/ab/Foo.png/22px-Foo.png -> Foo.png
//  - 22px-Foo.png -> Foo.png
const norm = (u) => {
  let s = String(u);
  const f = s.match(/[?&]f=([^&]+)/);
  if (f) s = f[1];
  else {
    try { s = decodeURIComponent(s.split('?')[0]); } catch { s = s.split('?')[0]; }
    s = s.split('/').pop();
  }
  try { s = decodeURIComponent(s); } catch { /* keep */ }
  return s.replace(/^\d+px-/, '');
};
const collect = (html) => {
  const out = [];
  for (const m of html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)) out.push(norm(m[1]));
  for (const m of html.matchAll(/<img[^>]*\sdata-src="([^"]+)"/g)) out.push(norm(m[1]));
  return out;
};

const rows = [];
let totalMissing = 0;
for (const f of fs.readdirSync(srcDir).filter((x) => x.endsWith('.json'))) {
  const rec = readJson(path.join(srcDir, f));
  const raw = rec?.html || rec?.text || (typeof rec === 'string' ? rec : '');
  if (!raw) continue;
  const siteFile = path.join(SITE, f.replace(/\.json$/, '.html'));
  if (!fs.existsSync(siteFile)) continue;
  const srcImgs = collect(raw);
  const outImgs = collect(fs.readFileSync(siteFile, 'utf8'));
  const have = new Map();
  for (const s of outImgs) have.set(s, (have.get(s) || 0) + 1);
  const missing = [];
  for (const s of srcImgs) {
    const c = have.get(s) || 0;
    if (c > 0) have.set(s, c - 1);
    else missing.push(s);
  }
  if (missing.length) {
    totalMissing += missing.length;
    rows.push([f, missing.length, missing]);
  }
}
rows.sort((a, b) => b[1] - a[1]);
console.log(`pages with source images missing from output: ${rows.length}  total missing refs=${totalMissing}`);
for (const [f, n, list] of rows.slice(0, top)) {
  const uniq = [...new Set(list)];
  console.log(`  ${String(n).padStart(4)}  ${f}  e.g. ${uniq.slice(0, 6).join(', ')}`);
}
