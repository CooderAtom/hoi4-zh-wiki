// Scan all built pages for untranslated English text inside table cells,
// and report untranslated page titles from the registry.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../dom.mjs';
import { Store, normalize } from '../translate.mjs';
import { readJson, SITE, DATA } from '../lib.mjs';

const store = new Store();
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const isUntranslated = (s) => {
  const t = normalize(s);
  if (t.length < 2 || !LATIN.test(t) || CJK.test(t)) return false;
  if (/^\s*[\W\d_]+\s*$/.test(t)) return false;
  return true;
};

const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html') && !['index.html', 'search.html', 'all-pages.html', 'glossary.html', 'progress.html'].includes(f));
const rows = [];
let scanned = 0;
for (const f of files) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  const start = html.indexOf('mw-parser-output');
  if (start < 0) continue;
  const body = html.slice(html.lastIndexOf('<div', start), html.indexOf('</main>', start));
  let root;
  try { root = parse(body); } catch { continue; }
  scanned++;
  let inTable = 0, inTableChars = 0, outside = 0, outsideChars = 0;
  for (const e of root.descendants()) {
    for (const c of e.children || []) {
      if (c.type !== 3 || !isUntranslated(c.data)) continue;
      const t = normalize(c.data);
      // is this text node inside a table?
      let inTbl = false, n = e;
      while (n) { if (n.type === 1 && n.name === 'table') { inTbl = true; break; } n = n.parent; }
      if (inTbl) { inTable++; inTableChars += t.length; } else { outside++; outsideChars += t.length; }
    }
  }
  rows.push({ f, inTable, inTableChars, outside, outsideChars });
}
rows.sort((a, b) => b.inTableChars - a.inTableChars);
console.log(`scanned ${scanned} pages`);
console.log(`pages with ANY untranslated table text: ${rows.filter((r) => r.inTable > 0).length}`);
console.log(`pages with untranslated NON-table text: ${rows.filter((r) => r.outside > 0).length}`);
console.log('\ntop 30 by untranslated chars inside tables:');
for (const r of rows.slice(0, 30)) {
  console.log(`${String(r.inTableChars).padStart(7)}c /${String(r.inTable).padStart(4)} nodes   (non-table ${String(r.outsideChars).padStart(6)}c)  ${r.f}`);
}

// untranslated titles
const manifest = readJson(path.join(DATA, 'pages.json'), { pages: [] });
const untitled = manifest.pages.filter((p) => store.get(p.title) === undefined).map((p) => p.title);
console.log(`\npage titles with no translation in TM: ${untitled.length} / ${manifest.pages.length}`);
console.log(untitled.slice(0, 60).join('\n'));
