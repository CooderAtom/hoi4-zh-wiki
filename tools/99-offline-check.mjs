// Audit: every <img src> in built pages must exist on disk (offline correctness).
import fs from 'node:fs';
import path from 'node:path';
import { SITE } from './lib.mjs';

const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
let pagesWithImg = 0, totalImgs = 0, missing = 0;
const missingSet = new Map();
const extSet = new Map();
for (const f of files) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  const srcs = [...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  if (!srcs.length) continue;
  pagesWithImg++;
  for (const s of srcs) {
    totalImgs++;
    if (/^https?:/i.test(s)) { missingSet.set(s, 'REMOTE'); missing++; continue; }
    const rel = decodeURIComponent(s).replace(/^\.\//, '').replace(/^\//, '');
    const p = path.join(SITE, rel);
    const ext = path.extname(rel).toLowerCase() || '(none)';
    extSet.set(ext, (extSet.get(ext) || 0) + 1);
    if (!fs.existsSync(p)) { missingSet.set(s, 'ABSENT'); missing++; }
  }
}
console.log(`pages=${files.length} pagesWithImg=${pagesWithImg} imgRefs=${totalImgs} missing=${missing}`);
console.log('extensions:', [...extSet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([e, n]) => `${e}:${n}`).join(' '));
const byReason = {};
for (const [s, r] of missingSet) byReason[r] = (byReason[r] || 0) + 1;
console.log('missing reasons:', JSON.stringify(byReason));
console.log('sample missing:', [...missingSet.keys()].slice(0, 8));

// also: check internal page links resolve
let linkTotal = 0, linkBad = 0;
const badSample = [];
const known = new Set(files);
for (const f of files) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  for (const m of html.matchAll(/<a[^>]*href="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|#)/i.test(href)) continue;
    linkTotal++;
    const rel = decodeURIComponent(href.split('#')[0]).replace(/^\.\//, '');
    if (!rel) continue;
    if (rel.startsWith('../')) continue;
    if (!known.has(rel) && !fs.existsSync(path.join(SITE, rel))) { linkBad++; if (badSample.length < 8) badSample.push(`${f} -> ${href}`); }
  }
}
console.log(`internal links=${linkTotal} broken=${linkBad}`);
console.log('broken sample:', badSample);
