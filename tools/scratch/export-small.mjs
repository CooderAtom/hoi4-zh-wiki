import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const small = rows
  .map(r => ({ t: r.title, left: Math.round(r.proseChars - r.translatedChars), pct: r.pct }))
  .filter(r => r.translated === undefined || true)
  .filter(r => {
    const x = rows.find(y => y.title === r.t);
    return x.translatedChars > 0 && x.pct < 0.995 && r.left >= 1 && r.left <= 2000;
  })
  .sort((a, b) => a.left - b.left);

console.log('targets: ' + small.length + ' pages, total left ' +
  small.reduce((a, r) => a + r.left, 0).toLocaleString());
console.log('');
for (const r of small) {
  try {
    const out = execFileSync('node', ['tools/10d-export-prose.mjs', r.t], { encoding: 'utf8' });
    const m = out.match(/pending=(\d+) units \/ (\d+) chars/);
    console.log('OK   ' + r.t + '  (left ' + r.left + ') ' + (m ? m[0] : out.trim()));
  } catch (e) {
    console.log('FAIL ' + r.t + '  ' + String(e.stderr || e.message).slice(0, 120));
  }
}
