// 1) Resolve hub item titles that had no coverage row (redirects / aliases).
// 2) Total remaining chars for the patch family.
// 3) Diagnose whether the biggest visible hub gap (Achievements) is a real gap or a structural blocker.
import fs from 'node:fs';
import { HUBS } from '../registry.mjs';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byTitle = new Map(rows.map((r) => [r.title, r]));
const fetched = JSON.parse(fs.readFileSync('data/fetched.json', 'utf8'));

// build alias -> canonical
const alias = new Map();
for (const [title, info] of Object.entries(fetched.pages || {})) {
  if (!info.ok) continue;
  const canonical = info.title;
  alias.set(title, canonical);
  for (const from of info.redirectedFrom || []) alias.set(from, canonical);
}

console.log('=== 1) HUB ITEMS WITHOUT A DIRECT COVERAGE ROW ===');
for (const hub of HUBS) {
  for (const [title, zh] of hub.items) {
    if (byTitle.has(title)) continue;
    const canonical = alias.get(title);
    const r = canonical ? byTitle.get(canonical) : null;
    console.log('  ' + hub.zh + ' / ' + zh + ' <' + title + '>  ->  canonical=' + (canonical || 'NOT FOUND')
      + (r ? '  pct=' + (r.pct * 100).toFixed(1) + '% left=' + (r.proseChars - r.translatedChars) : '  (no coverage row)'));
  }
}

console.log('\n=== 2) PATCH FAMILY REMAINING ===');
const patch = rows.filter((r) => /^Patch /.test(r.title));
let pl = 0, pc = 0, pdone = 0;
for (const r of patch) { pl += r.proseChars - r.translatedChars; pc += r.proseChars; if (r.pct >= 0.999) pdone++; }
console.log('  patch pages=' + patch.length + '  done=' + pdone + '  prose=' + pc + '  remaining=' + pl);
const undone = patch.filter((r) => r.pct < 0.999 && r.proseChars - r.translatedChars > 0)
  .sort((a, b) => (b.proseChars - b.translatedChars) - (a.proseChars - a.translatedChars));
console.log('  patch pages still unfinished: ' + undone.length);
for (const r of undone.slice(0, 20)) {
  console.log('    left=' + String(r.proseChars - r.translatedChars).padStart(6) + '  ' + (r.pct * 100).toFixed(1).padStart(5) + '%  ' + r.title);
}

console.log('\n=== 3) IS THE "Achievements" GAP REAL? ===');
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const rec = pageUnits['Achievements'];
if (!rec) { console.log('  no page-units row for Achievements'); }
else {
  const byK = new Map(units.map((u) => [u.k, u]));
  const total = rec.units.length;
  console.log('  unit keys on page: ' + total);
  // crude store check: does a TM shard contain the english text?
  const tm = JSON.parse(fs.readFileSync('data/tm.json', 'utf8'));
  const entries = tm.entries || tm;
  console.log('  tm type=' + (Array.isArray(entries) ? 'array' : typeof entries) + ' size=' + (Array.isArray(entries) ? entries.length : Object.keys(entries).length));
}
