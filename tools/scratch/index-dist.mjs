// Distribution of page text lengths, to choose a per-page search cap sensibly.
import fs from 'node:fs';
import path from 'node:path';
const SITE = 'site';
const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
const lens = [];
for (const f of files) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  lens.push([f, body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length]);
}
lens.sort((a, b) => b[1] - a[1]);
const total = lens.reduce((s, [, n]) => s + n, 0);
console.log(`pages=${lens.length} total=${total.toLocaleString()}`);
const cum = (k) => lens.slice(0, k).reduce((s, [, n]) => s + n, 0);
for (const k of [5, 10, 25, 50, 100, 200, 400, 660]) {
  console.log(`  top ${String(k).padStart(3)} pages hold ${(100 * cum(k) / total).toFixed(1).padStart(5)}% of all text`);
}
const buckets = [[0, 2000], [2000, 5000], [5000, 10000], [10000, 30000], [30000, 1e9]];
for (const [lo, hi] of buckets) {
  const sel = lens.filter(([, n]) => n >= lo && n < hi);
  console.log(`  ${String(lo).padStart(6)}-${String(hi === 1e9 ? 'inf' : hi).padStart(6)} chars: ${String(sel.length).padStart(4)} pages, ${sel.reduce((s, [, n]) => s + n, 0).toLocaleString()} chars`);
}
