import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const tiny = rows
  .map(r => ({ t: r.title, left: Math.round(r.proseChars - r.translatedChars), pct: r.pct }))
  .filter(r => r.pct < 0.995 && r.left >= 1 && r.left <= 200 && r.pct > 0)
  .sort((a, b) => a.left - b.left);

for (const r of tiny) {
  try {
    const out = execFileSync('node', ['tools/10d-export-prose.mjs', r.t], { encoding: 'utf8' });
    const line = out.trim().split('\n').filter(l => l.startsWith('page=')).pop() || '';
    console.log(r.t + ' | left=' + r.left + ' | ' + line);
  } catch (e) {
    console.log(r.t + ' | FAIL ' + String(e.stderr || e.message).slice(0, 80));
  }
}
