// Check whether hub entries that fail to resolve exist anywhere in the fetched registry under another name.
import fs from 'node:fs';
import { HUBS } from '../registry.mjs';

const fetched = JSON.parse(fs.readFileSync('data/fetched.json', 'utf8'));
const ok = Object.entries(fetched.pages || {}).filter(([, i]) => i.ok);
const titles = ok.map(([t, i]) => i.title || t);

const missing = [];
for (const hub of HUBS) for (const [title, zh] of hub.items) {
  const direct = titles.some((t) => t.toLowerCase() === title.toLowerCase());
  if (!direct) missing.push({ hub: hub.zh, title, zh });
}

console.log('hub entries with no exact-title page: ' + missing.length);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
for (const m of missing) {
  const cand = titles.filter((t) => norm(t).includes(norm(m.title)) || norm(m.title).includes(norm(t)));
  console.log('\n  ' + m.hub + ' / ' + m.zh + ' <' + m.title + '>');
  console.log('    near matches in registry: ' + (cand.length ? cand.slice(0, 8).join(' | ') : 'NONE'));
}

console.log('\n--- registry titles containing key words ---');
for (const w of ['decision', 'stability', 'war support', 'lend', 'attrition', 'encircle', 'naval unit', 'air unit', 'technology']) {
  const hits = titles.filter((t) => t.toLowerCase().includes(w));
  console.log('  "' + w + '": ' + (hits.length ? hits.slice(0, 6).join(' | ') : 'NONE'));
}
