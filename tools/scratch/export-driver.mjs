import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const list = rows
  .map(r => ({ t: r.title, left: Math.round(r.proseChars - r.translatedChars), pct: r.pct }))
  .filter(r => r.pct < 0.995 && r.left >= 1)
  .sort((a, b) => a.left - b.left);

const BATCH = 20;
console.log('pages needing export: ' + list.length + ' (batch size ' + BATCH + ')');
let i = 0, n = 0;
for (let s = 0; s < list.length; s += BATCH) {
  const chunk = list.slice(s, s + BATCH);
  console.log('--- sweep ' + (++n) + ': ' + chunk.length + ' pages ---');
  for (const r of chunk) {
    try {
      const out = execFileSync('node', ['tools/10d-export-prose.mjs', r.t], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const m = out.match(/pending=(\d+) units \/ (\d+) chars/);
      if (m && m[1] !== '0') i++;
    } catch { /* page has no units */ }
  }
  console.log('    cumulative pages with pending items: ' + i);
  if (s + BATCH >= 200) break; // cap per invocation; re-run for more
}
console.log('\ndone. pages with pending: ' + i);
