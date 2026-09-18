// Site-wide scan: count text still reading as English inside each page's article body,
// and compare with what 08b-page-gap considers "untranslated prose". The point is to find
// pages that LOOK finished (gap=0) but still show English to a reader.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../dom.mjs';

const SITE = 'site';
const SKIP = new Set(['index.html', 'search.html', 'all-pages.html', 'glossary.html', 'progress.html']);
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const norm = (t) => String(t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const un = (t) => t.length >= 2 && LATIN.test(t) && !CJK.test(t) && !/^\s*[\W\d_]+\s*$/.test(t);

const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html') && !SKIP.has(f));
const rows = [];
for (const f of files) {
  const h = fs.readFileSync(path.join(SITE, f), 'utf8');
  const s = h.indexOf('mw-parser-output');
  if (s < 0) continue;
  let root;
  try { root = parse(h.slice(h.lastIndexOf('<div', s), h.indexOf('</main>', s) > 0 ? undefined : undefined)); } catch { continue; }
  let nodes = 0, chars = 0;
  const texts = new Set();
  for (const e of root.descendants()) {
    for (const c of e.children || []) {
      if (c.type !== 3) continue;
      const t = norm(c.data);
      if (!un(t)) continue;
      nodes++; chars += t.length; texts.add(t);
    }
  }
  rows.push({ f, nodes, chars, uniq: texts.size });
}
rows.sort((a, b) => b.chars - a.chars);
const withAny = rows.filter((r) => r.nodes > 0);
console.log(`pages scanned: ${rows.length}`);
console.log(`pages with visible English text in body: ${withAny.length}`);
console.log(`total English text nodes: ${rows.reduce((a, r) => a + r.nodes, 0)}, chars: ${rows.reduce((a, r) => a + r.chars, 0).toLocaleString()}`);
console.log('\ntop 50 pages by remaining English chars in body:');
for (const r of rows.slice(0, 50)) console.log(`${String(r.chars).padStart(7)}c ${String(r.nodes).padStart(5)}n ${String(r.uniq).padStart(5)}u  ${r.f}`);
fs.writeFileSync('data/work/english-scan.json', JSON.stringify(rows, null, 1));
console.log('\nfull list -> data/work/english-scan.json');
