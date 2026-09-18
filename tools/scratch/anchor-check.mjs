// Verify every in-page anchor resolves to an existing id (catches a TOC/heading desync).
import fs from 'node:fs';

const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const anchors = (html) => [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);

let bad = 0;
for (const f of process.argv.slice(2)) {
  const html = fs.readFileSync(f, 'utf8');
  const have = ids(html);
  const want = [...new Set(anchors(html))];
  const missing = want.filter((a) => !have.has(a));
  console.log(`${f}: anchors=${want.length} unresolved=${missing.length}`);
  for (const m of missing.slice(0, 10)) console.log('   MISSING #' + m);
  bad += missing.length;
}
console.log(bad ? `\n${bad} UNRESOLVED ANCHOR(S)` : '\nall anchors resolve');
process.exit(bad ? 1 : 0);
