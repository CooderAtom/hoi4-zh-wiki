import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const tiny = rows
  .map(r => ({ t: r.title, left: Math.round(r.proseChars - r.translatedChars), pct: r.pct }))
  .filter(r => r.pct < 0.995 && r.pct > 0 && r.left >= 1 && r.left <= 200)
  .sort((a, b) => a.left - b.left);

console.log('targets: ' + tiny.length);
for (const r of tiny) {
  try {
    const out = execFileSync('node', ['tools/10d-export-prose.mjs', r.t], { encoding: 'utf8' });
    console.log('OK ' + r.t + ' | ' + (out.trim().split('\n').pop() || ''));
  } catch (e) {
    console.log('FAIL ' + r.t + ' ' + String(e.stderr || e.message).slice(0, 100));
  }
}
