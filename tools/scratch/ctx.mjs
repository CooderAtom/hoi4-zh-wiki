// Print raw HTML context around a literal search string in a built page.
//   node tools/scratch/ctx.mjs <Page_slug> "<search>" [before] [after]
import fs from 'node:fs';
const slug = process.argv[2];
const needle = process.argv[3];
const before = Number(process.argv[4] || 400);
const after = Number(process.argv[5] || 400);
const html = fs.readFileSync('site/' + slug + '.html', 'utf8');
let from = 0, n = 0;
for (;;) {
  const i = html.indexOf(needle, from);
  if (i < 0) break;
  n++;
  console.log('--- hit ' + n + ' at ' + i + ' ---');
  console.log(html.slice(Math.max(0, i - before), i + needle.length + after));
  console.log('');
  from = i + needle.length;
  if (n >= 3) break;
}
if (!n) console.log('not found: ' + needle);
