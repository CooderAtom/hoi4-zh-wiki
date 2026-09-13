// Estimate search-index size for candidate per-page character caps.
// The index stores normalize(body.textContent).slice(0, CAP) per page, so raising CAP is the only
// lever on full-text coverage. Measures coverage and estimated bytes (UTF-8, CJK is 3 bytes/char).
import fs from 'node:fs';
import path from 'node:path';
const SITE = 'site';
const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
const texts = [];
for (const f of files) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  texts.push(body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}
const total = texts.reduce((s, t) => s + t.length, 0);
const bytes = (s) => {
  let b = 0;
  for (const ch of s) b += ch.codePointAt(0) > 0x7f ? 3 : 1;
  return b;
};
console.log(`pages=${files.length}  total rendered text=${total.toLocaleString()} chars\n`);
console.log('cap    indexed chars   coverage   est. index bytes');
for (const cap of [2200, 4000, 6000, 8000, 12000, 0]) {
  let idx = 0, sample = '';
  for (const t of texts) {
    const s = cap ? t.slice(0, cap) : t;
    idx += s.length;
    if (sample.length < 400000) sample += s;
  }
  const est = Math.round(bytes(sample) * (idx / Math.max(1, sample.length)));
  console.log(`${String(cap || 'all').padStart(5)}  ${String(idx).padStart(13)}   ${(100 * idx / total).toFixed(1).padStart(6)}%   ${(est / 1048576).toFixed(2)} MB`);
}
