// List every heading whose rendered text has no Chinese, for the given pages.
import fs from 'node:fs';

for (const f of process.argv.slice(2)) {
  const h = fs.readFileSync(f, 'utf8');
  const re = /<h([1-6])[^>]*>\s*<span class="mw-headline"[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/span>/g;
  const bad = [];
  let m, total = 0;
  while ((m = re.exec(h))) {
    total++;
    const text = m[3].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!/[\u3400-\u4dbf\u4e00-\u9fff]/.test(text)) bad.push({ lvl: m[1], id: m[2], text });
  }
  console.log(`\n##### ${f}: ${bad.length} of ${total} headings have NO Chinese`);
  for (const b of bad) console.log(`   h${b.lvl} id=${b.id}  "${b.text}"`);
}
