import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const tiny = rows
  .map(r => ({ t: r.title, left: Math.round(r.proseChars - r.translatedChars), pct: r.pct }))
  .filter(r => r.pct < 0.995 && r.left >= 1 && r.left <= 400 && r.pct > 0)
  .sort((a, b) => a.left - b.left);

// The exporter clearly caps how many pages it will export in one invocation.
// Run one page per process so every page is guaranteed to be covered.
let ok = 0, fail = 0;
for (const r of tiny) {
  try {
    const out = execFileSync('node', ['tools/10d-export-prose.mjs', r.t], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = out.match(/pending=(\d+) units \/ (\d+) chars/);
    ok++;
    console.log('OK   ' + r.t.padEnd(34) + ' left=' + String(r.left).padStart(4) + '  ' + (m ? m[0] : ''));
  } catch (e) {
    fail++;
    console.log('FAIL ' + r.t.padEnd(34) + ' ' + String(e.stderr || e.message).slice(0, 70));
  }
}
console.log('\nexported ' + ok + ', failed ' + fail);
