import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const names = ['Nuke events', 'News events 1', 'German events', 'Political events', 'Countries', 'Downloadable content', 'Intel'];
for (const n of names) {
  console.log('=== ' + n + ' ===');
  try {
    const out = execFileSync('node', ['tools/10d-export-prose.mjs', n], { encoding: 'utf8' });
    console.log(out.trim());
  } catch (e) {
    console.log('ERR ' + String(e.stderr || e.message).slice(0, 200));
  }
}
