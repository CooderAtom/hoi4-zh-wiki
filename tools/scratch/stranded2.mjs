// Find GENUINELY untranslated English text in the article body of a built page.
// "Untranslated" = no CJK in the text node at all. Nodes that mix CJK with Latin
// (e.g. "悖论乐园（Paradisus Paradoxum）") are intentional and ignored.
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { Store, normalize } from '../translate.mjs';

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
// Article body = the mw-parser-output div, NOT the shell (sidebar/toc/footer are generated
// by page.mjs and can legitimately mix English in parentheses).
const start = html.indexOf('mw-parser-output');
if (start < 0) { console.log('NO mw-parser-output in', file); process.exit(0); }
const open = html.lastIndexOf('<div', start);
const end = html.indexOf('</main>', start);
const art = html.slice(open, end > 0 ? end : undefined);
const root = parse(art);

const store = new Store();
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const isUntranslated = (s) => {
  const t = normalize(s);
  if (t.length < 2) return false;
  if (!LATIN.test(t)) return false;
  if (CJK.test(t)) return false;
  if (/^\s*[\W\d_]+\s*$/.test(t)) return false;
  return true;
};

function pathOf(node) {
  const bits = [];
  let n = node.parent;
  while (n && n.type === 1 && bits.length < 5) {
    let s = n.name;
    const cls = n.attr && n.attr('class');
    if (cls) s += '.' + String(cls).split(/\s+/).slice(0, 2).join('.');
    bits.unshift(s);
    n = n.parent;
  }
  return bits.join('>');
}

let total = 0, chars = 0, inTm = 0, inTmChars = 0;
const buckets = new Map();
const samples = [];
for (const e of root.descendants()) {
  for (const c of e.children || []) {
    if (c.type !== 3) continue;
    if (!isUntranslated(c.data)) continue;
    const t = normalize(c.data);
    total++; chars += t.length;
    const k = pathOf(c);
    buckets.set(k, (buckets.get(k) || 0) + 1);
    const has = store.get(t) !== undefined;
    if (has) { inTm++; inTmChars += t.length; }
    if (samples.length < 40) samples.push({ c: t.length, has, k, t });
  }
}

console.log(`FILE ${file}`);
console.log(`Untranslated English text nodes in article: ${total}  (${chars} chars)`);
console.log(`  of which ALREADY IN TRANSLATION MEMORY: ${inTm}  (${inTmChars} chars)  <- stored but never rendered`);
console.log('\n--- by ancestry (top 20) ---');
for (const [k, v] of [...buckets].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`${String(v).padStart(4)}  ${k}`);
console.log('\n--- samples ---');
for (const s of samples) console.log(`${s.has ? 'IN-TM' : '     '} ${String(s.c).padStart(5)}c  [${s.k}]\n      ${s.t.slice(0, 120)}`);
