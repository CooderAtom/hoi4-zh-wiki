// Report translation progress per index hub (the second-level pages reached from index.html).
import fs from 'node:fs';
import { HUBS } from '../registry.mjs';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byTitle = new Map(rows.map((r) => [r.title, r]));
// Follow the same aliases the Registry uses, so hub entries that are upstream redirects
// (Decisions -> List of Decision lists, etc.) are attributed to their real page.
const ALIAS = JSON.parse(fs.readFileSync('data/redirect-aliases.json', 'utf8')).aliases || {};
const look = (t) => byTitle.get(t) || byTitle.get(ALIAS[t]);

const pctStr = (r) => (r.pct * 100).toFixed(1).padStart(5) + '%';
const left = (r) => r.proseChars - r.translatedChars;

let hubTotLeft = 0, hubTotChars = 0, hubDone = 0, hubPages = 0;
for (const hub of HUBS) {
  console.log('\n=== ' + hub.zh + ' (' + hub.en + ') ===');
  const agg = [];
  for (const [title, zh] of hub.items) {
    const r = look(title);
    if (!r) { console.log('  MISSING FROM COVERAGE: ' + title); continue; }
    agg.push(r);
    hubTotLeft += left(r); hubTotChars += r.proseChars; hubPages++;
    if (r.pct >= 0.999) hubDone++;
    const flag = r.pct >= 0.999 ? 'DONE ' : '     ';
    console.log('  ' + flag + pctStr(r) + '  left=' + String(left(r)).padStart(7) + '  prose=' + String(r.proseChars).padStart(7) + '  ' + zh + '  <' + title + '>');
  }
  const aL = agg.reduce((s, r) => s + left(r), 0);
  const aC = agg.reduce((s, r) => s + r.proseChars, 0);
  const aT = agg.reduce((s, r) => s + r.translatedChars, 0);
  console.log('  -- hub total: ' + (aC ? (100 * aT / aC).toFixed(1) : '100.0') + '%  left=' + aL + '  of ' + aC + ' chars;  done pages ' + agg.filter((r) => r.pct >= 0.999).length + '/' + agg.length);
}

console.log('\n################ GRAND HUB TOTALS ################');
console.log('hub landing pages: ' + hubPages + '   already DONE: ' + hubDone + '   not-done: ' + (hubPages - hubDone));
console.log('hub prose chars: ' + hubTotChars + '   remaining: ' + hubTotLeft + '   coverage: ' + (100 * (hubTotChars - hubTotLeft) / hubTotChars).toFixed(1) + '%');

// overall distribution
const allLeft = rows.reduce((s, r) => s + left(r), 0);
console.log('\n################ ALL ' + rows.length + ' PAGES ################');
console.log('total remaining chars: ' + allLeft);
const notDone = rows.filter((r) => r.pct < 0.999);
console.log('pages not at >=99.5%: ' + notDone.length);
const buckets = [[0, 0.001], [0.001, 0.05], [0.05, 0.2], [0.2, 0.5], [0.5, 0.8], [0.8, 0.995]];
for (const [lo, hi] of buckets) {
  const sel = rows.filter((r) => r.pct >= lo && r.pct < hi);
  console.log('  pct [' + (lo * 100).toFixed(1) + '%-' + (hi * 100).toFixed(1) + '%): pages=' + String(sel.length).padStart(3) + '  left chars=' + String(sel.reduce((s, r) => s + left(r), 0)).padStart(7));
}
// tiny-residue pages: not done but very little left -> likely structural residue
const tiny = notDone.filter((r) => left(r) > 0 && left(r) <= 120);
console.log('\nnot-done pages with <=120 chars left (likely structural / zh===en residue): ' + tiny.length
  + '  sum=' + tiny.reduce((s, r) => s + left(r), 0) + ' chars');
const real = notDone.filter((r) => left(r) > 120);
console.log('not-done pages with >120 chars left (genuinely unfinished): ' + real.length
  + '  sum=' + real.reduce((s, r) => s + left(r), 0) + ' chars');
console.log('\ntop 25 genuinely-unfinished pages:');
for (const r of real.slice().sort((a, b) => left(b) - left(a)).slice(0, 25)) {
  console.log('  left=' + String(left(r)).padStart(7) + '  ' + pctStr(r) + '  ' + r.title);
}
