// Find how a given English string (e.g. an achievement name) is rendered in the built site, so new
// translations reuse the SAME wording. Reads the pages whose titles are given.
import fs from 'node:fs';
import path from 'node:path';
const SITE = 'site';
const needles = process.argv.slice(2);
for (const n of needles) {
  const out = [];
  for (const f of fs.readdirSync(SITE).filter((x) => x.endsWith('.html'))) {
    const s = fs.readFileSync(path.join(SITE, f), 'utf8');
    let i = s.indexOf(n);
    while (i >= 0 && out.length < 8) {
      out.push(`${f}: …${s.slice(Math.max(0, i - 60), i + n.length + 40).replace(/\s+/g, ' ')}…`);
      i = s.indexOf(n, i + 1);
    }
  }
  console.log(`\n=== "${n}"  (${out.length} shown)`);
  for (const o of out) console.log('  ' + o);
}
