// Site-wide audit: headings and <h1> titles with no Chinese, across every built page.
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'site';
const SKIP = new Set(['index.html', 'search.html', 'all-pages.html', 'glossary.html', 'progress.html']);
const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html') && !SKIP.has(f));
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

let pagesWith = 0, totalHeadings = 0, badHeadings = 0;
const rows = [];
for (const f of files) {
  const h = fs.readFileSync(path.join(SITE, f), 'utf8');
  const s = h.indexOf('mw-parser-output');
  if (s < 0) continue;
  const body = h.slice(h.lastIndexOf('<div', s));
  const re = /<h([1-6])[^>]*>\s*<span class="mw-headline"[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/span>/g;
  let m, tot = 0;
  const bad = [];
  while ((m = re.exec(body))) {
    tot++; totalHeadings++;
    const text = m[3].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (text && !CJK.test(text)) { bad.push(`h${m[1]}:${m[2]}:${text}`); badHeadings++; }
  }
  if (bad.length) { pagesWith++; rows.push({ f, tot, bad }); }
}
rows.sort((a, b) => b.bad.length - a.bad.length);
console.log(`pages scanned: ${files.length}`);
console.log(`pages with >=1 untranslated heading: ${pagesWith}`);
console.log(`headings total: ${totalHeadings}, untranslated: ${badHeadings}`);
console.log('\ntop 40 pages:');
for (const r of rows.slice(0, 40)) console.log(`${String(r.bad.length).padStart(4)}/${String(r.tot).padStart(3)}  ${r.f}`);
const out = 'data/work/heading-audit.json';
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
console.log('\nfull list -> ' + out);
