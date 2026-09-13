import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const p = r
  .map(x => ({ t: x.title, l: Math.round(x.proseChars - x.translatedChars), pct: x.pct }))
  .filter(x => x.l <= 200 && (x.pct > 0 ? x.l >= 1 : x.l === 0 ? false : x.l >= 0) && x.pct < 0.995)
  .sort((a, b) => a.l - b.l);
console.log('pages with leftover pct>0, <=200 chars: ' + p.length +
  ', total ' + p.reduce((a, x) => a + x.l, 0).toLocaleString());
console.log('');
for (const x of p) console.log('  ' + String(x.l).padStart(4) + '  ' + x.t);
