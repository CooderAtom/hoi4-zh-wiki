import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const targets = rows
  .map(r => ({ t: r.title, left: Math.round(r.proseChars - r.translatedChars), pct: r.pct }))
  .filter(r => r.pct < 0.995 && r.left >= 1 && r.left <= 5000)
  .sort((a, b) => b.left - a.left);

console.log('exporting ' + targets.length + ' pages, one process each');
let ok = 0, empty = 0, fail = 0, chars = 0, items = 0;
for (const r of targets) {
  try {
    const out = execFileSync('node', ['tools/10d-export-prose.mjs', r.t], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = out.match(/pending=(\d+) units \/ (\d+) chars/);
    if (m) {
      const n = Number(m[1]), c = Number(m[2]);
      items += n; chars += c;
      if (n === 0) empty++; else ok++;
      console.log('OK  ' + String(r.left).padStart(5) + '  ' + r.t.padEnd(46) + n + ' items / ' + c + ' chars');
    } else { empty++; }
  } catch (e) { fail++; console.log('FAIL ' + r.t + ' ' + String(e.stderr || e.message).slice(0, 70)); }
}
console.log('\nwith items: ' + ok + ', empty: ' + empty + ', failed: ' + fail);
console.log('total items: ' + items + ', total chars: ' + chars.toLocaleString());
