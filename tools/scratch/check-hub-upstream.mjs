// F: Check whether the 9 hub entries that silently vanish from index.html exist upstream,
// and whether they are redirects (and to what).
import { api } from '../lib.mjs';

const TITLES = ['Decisions', 'Stability', 'War support', 'Lend-Lease', 'Attrition',
  'Encirclement', 'Naval units', 'Air units', 'Technology'];

const d = await api({
  action: 'query',
  titles: TITLES.join('|'),
  redirects: '1',
  format: 'json',
  formatversion: '2',
});

console.log('=== normalize/redirect mapping ===');
for (const r of d.query?.redirects || []) console.log('  REDIRECT: ' + r.from + '  ->  ' + r.to);
for (const n of d.query?.normalized || []) console.log('  NORMALIZED: ' + n.from + '  ->  ' + n.to);

console.log('\n=== page existence / target ===');
for (const p of d.query?.pages || []) {
  const status = p.missing ? 'MISSING (does not exist)' : 'EXISTS';
  console.log('  ' + status.padEnd(24) + ' ' + p.title + (p.redirect ? '  [redirect]' : '') + (p.length !== undefined ? '  len=' + p.length : ''));
}

// For each original title, follow the chain to the final target
console.log('\n=== resolution chain per hub entry ===');
const redir = new Map((d.query?.redirects || []).map((r) => [r.from, r.to]));
const norm = new Map((d.query?.normalized || []).map((n) => [n.from, n.to]));
const byTitle = new Map((d.query?.pages || []).map((p) => [p.title, p]));
for (const t of TITLES) {
  let cur = norm.get(t) || t;
  const chain = [cur];
  let guard = 0;
  while (redir.has(cur) && guard++ < 5) { cur = redir.get(cur); chain.push(cur); }
  const page = byTitle.get(cur);
  const verdict = page ? (page.missing ? 'MISSING' : 'EXISTS (final: ' + cur + ')') : 'UNRESOLVED';
  console.log('  ' + t.padEnd(16) + ' -> ' + chain.join(' -> ') + '   [' + verdict + ']');
}
