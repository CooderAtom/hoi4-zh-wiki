// How much body text does the offline search index actually cover?
// report.chars uses normalize(body.textContent).slice(0, 2200) per page, so a page whose Chinese
// text exceeds 2200 chars is searchable only in its first ~2200 chars.
import fs from 'node:fs';
import path from 'node:path';
const SITE = 'site';
const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
let capped = 0, totalBody = 0, totalIndexed = 0, over = 0;
const worst = [];
for (const f of files) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  totalBody += text.length;
  const idx = Math.min(text.length, 2200);
  totalIndexed += idx;
  if (text.length > 2200) { capped++; over += text.length - 2200; worst.push([f, text.length]); }
}
worst.sort((a, b) => b[1] - a[1]);
console.log(`pages: ${files.length}`);
console.log(`pages whose text exceeds the 2200-char cap: ${capped}`);
console.log(`rendered text total: ${totalBody.toLocaleString()} chars`);
console.log(`indexed text total : ${totalIndexed.toLocaleString()} chars  (${(100 * totalIndexed / totalBody).toFixed(1)}%)`);
console.log(`unindexed tail     : ${over.toLocaleString()} chars`);
console.log('\ntop 12 pages by rendered text length:');
for (const [f, n] of worst.slice(0, 12)) console.log(`  ${String(n).padStart(7)}  ${f}`);
