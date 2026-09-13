// Step 1: enumerate every main-namespace page, its size, categories, links and images.
// Output: data/pages.json
import fs from 'node:fs';
import path from 'node:path';
import { DATA, api, apiList, writeJson, pmap, getText, sleep } from './lib.mjs';

const t0 = Date.now();
console.log('[1/5] listing all main-namespace pages (non-redirect + redirect)...');

const nonRedir = await apiList(
  { action: 'query', list: 'allpages', apnamespace: '0', aplimit: '500', apfilterredir: 'nonredirects' },
  'allpages', { verbose: true });
const redirs = await apiList(
  { action: 'query', list: 'allpages', apnamespace: '0', aplimit: '500', apfilterredir: 'redirects' },
  'allpages', { verbose: true });
console.log('  pages:', nonRedir.length, 'redirects:', redirs.length);

const titles = nonRedir.map((p) => p.title);
console.log('[2/5] fetching size + categories for', titles.length, 'pages...');

const P = [];
for (let i = 0; i < titles.length; i += 50) {
  const batch = titles.slice(i, i + 50);
  const d = await api({
    action: 'query', titles: batch.join('|'), prop: 'revisions|categories|info',
    rvprop: 'size|timestamp', cllimit: 'max', inprop: 'url', format: 'json', formatversion: '2',
  });
  for (const p of d.query.pages) {
    P.push({
      title: p.title,
      size: p.revisions?.[0]?.size ?? 0,
      touched: p.revisions?.[0]?.timestamp ?? null,
      pageid: p.pageid,
      cats: (p.categories || []).map((c) => c.title.replace(/^Category:/, '')),
    });
  }
  process.stderr.write(`\r  ${Math.min(i + 50, titles.length)}/${titles.length}`);
}
process.stderr.write('\n');

// redirect map
console.log('[3/5] resolving redirect targets...');
const redirects = {};
for (let i = 0; i < redirs.length; i += 50) {
  const batch = redirs.slice(i, i + 50).map((p) => p.title);
  const d = await api({ action: 'query', titles: batch.join('|'), prop: 'redirects', rdprop: 'title', format: 'json', formatversion: '2' });
  for (const p of d.query.pages) {
    const r = p.redirects?.[0];
    if (r) redirects[p.title] = r.title;
  }
  process.stderr.write(`\r  ${Math.min(i + 50, redirs.length)}/${redirs.length}`);
}
process.stderr.write('\n');

writeJson(path.join(DATA, 'pages.json'), { generated: new Date().toISOString(), pages: P, redirects });

// category inventory
const cats = {};
for (const p of P) for (const c of p.cats) cats[c] = (cats[c] || 0) + 1;
const catList = Object.entries(cats).sort((a, b) => b[1] - a[1]);
writeJson(path.join(DATA, 'categories.json'), catList);

console.log('[4/5] top categories used by main-namespace pages:');
catList.slice(0, 70).forEach(([c, n]) => console.log(String(n).padStart(5), c));

console.log('[5/5] size histogram:');
const buckets = [[0, 2000], [2000, 10000], [10000, 30000], [30000, 60000], [60000, 150000], [150000, 1e9]];
for (const [a, b] of buckets) {
  const n = P.filter((p) => p.size >= a && p.size < b).length;
  const bytes = P.filter((p) => p.size >= a && p.size < b).reduce((s, p) => s + p.size, 0);
  console.log(`  ${String(a).padStart(6)}-${String(b === 1e9 ? 'inf' : b).padStart(6)}: ${String(n).padStart(4)} pages, ${(bytes / 1048576).toFixed(1)} MB`);
}
console.log('total wikitext MB:', (P.reduce((s, p) => s + p.size, 0) / 1048576).toFixed(1));
console.log('done in', ((Date.now() - t0) / 1000).toFixed(1), 's');
