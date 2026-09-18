// Print a readable window of markup around a regex match, with <img> collapsed.
import fs from 'node:fs';
import path from 'node:path';

const [file, pattern, ...rest] = process.argv.slice(2);
const before = Number(rest[0] ?? 400);
const after = Number(rest[1] ?? 1200);
const maxHits = Number(rest[2] ?? 3);

const html = fs.readFileSync(file, 'utf8');
const re = new RegExp(pattern, 'gi');
let m, n = 0;
while ((m = re.exec(html)) && n < maxHits) {
  n++;
  const s = Math.max(0, m.index - before);
  const e = Math.min(html.length, m.index + after);
  let win = html.slice(s, e);
  win = win.replace(/<img[^>]*>/gi, '<img>');
  win = win.replace(/<a ([^>]*?)href="([^"]*)"[^>]*>/gi, (all, mid, href) => `<a href="${href}">`);
  console.log(`\n########## hit ${n} at ${m.index} ##########`);
  console.log(win);
}
if (!n) console.log('NO MATCH for', pattern);
