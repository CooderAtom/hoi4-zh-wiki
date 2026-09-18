// For a page, list headings + untranslated text nodes and say whether the TM already holds a
// translation for each (i.e. is this a RENDER bug or a MISSING-translation bug?).
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { Store, normalize, key } from '../translate.mjs';

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const s = html.indexOf('mw-parser-output');
// Outer wrapper div spans the whole article; slicing to </main> would close too few tags.
const body = html.slice(html.lastIndexOf('<div', s));
const root = parse(body);
const store = new Store();

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const un = (t) => t.length >= 2 && LATIN.test(t) && !CJK.test(t) && !/^\s*[\W\d_]+\s*$/.test(t);

console.log(`##### ${file}`);
console.log('\n== HEADINGS ==');
for (const e of root.descendants()) {
  if (!/^h[1-6]$/.test(e.name)) continue;
  const span = (e.children || []).find((c) => c.type === 1 && c.name === 'span' && String(c.attr('class') || '').includes('mw-headline'));
  const txt = normalize(span ? span.textContent : e.textContent);
  const id = span ? span.attr('id') : '(no id)';
  const inTm = store.get(txt) !== undefined;
  const english = un(txt);
  if (english || inTm) {
    console.log(`  ${e.name} id=${String(id).padEnd(28)} ${english ? 'ENGLISH ' : 'translated'} inTM=${inTm ? 'YES' : 'no '}  "${txt.slice(0, 70)}"`);
  }
}

console.log('\n== UNTRANSLATED TEXT NODES ==');
const seen = new Map();
for (const e of root.descendants()) {
  for (const c of e.children || []) {
    if (c.type !== 3) continue;
    const t = normalize(c.data);
    if (!un(t)) continue;
    if (!seen.has(t)) seen.set(t, { n: 0, inTm: store.get(t) !== undefined, tag: e.name });
    seen.get(t).n++;
  }
}
const inTm = [...seen].filter(([, v]) => v.inTm);
const notTm = [...seen].filter(([, v]) => !v.inTm);
console.log(`unique untranslated strings: ${seen.size}  (already in TM: ${inTm.length}, absent from TM: ${notTm.length})`);
console.log('\n-- ALREADY IN TM but still English on the page (RENDER bug) --');
for (const [t, v] of inTm) console.log(`  x${String(v.n).padStart(3)} <${v.tag}> TM="${store.get(t).slice(0, 60)}"  EN="${t.slice(0, 70)}"`);
console.log('\n-- ABSENT from TM (MISSING translation) --');
for (const [t, v] of notTm.sort((a, b) => b[1].n - a[1].n)) console.log(`  x${String(v.n).padStart(3)} <${v.tag}> "${t.slice(0, 90)}"`);
