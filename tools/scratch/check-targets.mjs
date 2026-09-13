// Which redirect targets already exist locally, and does upstream have an Encirclement section anywhere?
import fs from 'node:fs';
import { api } from '../lib.mjs';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const local = new Map(rows.map((r) => [r.title, r]));
const fetched = JSON.parse(fs.readFileSync('data/fetched.json', 'utf8'));
const fetchedTitles = new Set(Object.entries(fetched.pages || {}).filter(([, i]) => i.ok).map(([t, i]) => i.title || t));

const TARGETS = ['Government', 'Research', 'Ship', 'Attrition and accidents', 'Diplomacy', 'List of Decision lists', 'Aircraft designer'];
console.log('=== do the 7 redirect targets exist locally? ===');
for (const t of TARGETS) {
  const r = local.get(t);
  console.log('  ' + (r ? 'LOCAL OK ' : 'ABSENT   ') + t
    + (r ? '   pct=' + (r.pct * 100).toFixed(1) + '%  left=' + (r.proseChars - r.translatedChars) : '')
    + (fetchedTitles.has(t) ? '' : '   [not in fetched.json]'));
}

console.log('\n=== upstream search for "Encirclement" ===');
const s = await api({ action: 'query', list: 'search', srsearch: 'Encirclement', srlimit: '8', format: 'json', formatversion: '2' });
for (const h of s.query?.search || []) console.log('  ' + h.title);

console.log('\n=== upstream: is Encirclement a section of another page? (linkshere/redirect check) ===');
const li = await api({ action: 'query', titles: 'Encirclement', prop: 'links|info', format: 'json', formatversion: '2' });
for (const p of li.query?.pages || []) {
  console.log('  title=' + p.title + ' missing=' + !!p.missing + ' links=' + (p.links ? p.links.length : 'n/a'));
}
