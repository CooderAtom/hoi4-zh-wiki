// Round 50: how many in-site pages link to a given target? Used to decide whether removing a
// corporate page is a real navigation cleanup or merely a file deletion.
import fs from 'node:fs';
import path from 'node:path';
const targets = process.argv.slice(2);
const files = fs.readdirSync('site').filter((f) => f.endsWith('.html'));
for (const t of targets) {
  let n = 0;
  const from = [];
  const re = new RegExp('href="' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"');
  for (const f of files) {
    if (f === t) continue;
    const s = fs.readFileSync(path.join('site', f), 'utf8');
    if (re.test(s)) { n++; if (from.length < 8) from.push(f); }
  }
  console.log(t.padEnd(28) + ' backlinks: ' + String(n).padStart(4) + (from.length ? '   e.g. ' + from.join(', ') : ''));
}
