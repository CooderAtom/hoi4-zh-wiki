// Render a page from its English backup through the REAL pipeline and compare the visible
// text with the current hand-patched page. Tells us whether a future rebuild reproduces
// equivalent Chinese, or whether the hand patch is materially better.
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { applyTranslations } from '../units.mjs';
import { Store, normalize } from '../translate.mjs';

const [backup, current, label] = process.argv.slice(2);
const store = new Store();

function render(file) {
  const html = fs.readFileSync(file, 'utf8');
  const s = html.indexOf('mw-parser-output');
  const head = html.slice(0, html.lastIndexOf('<div', s));
  const tail = html.slice(html.lastIndexOf('<div', s));
  const root = parse(tail);
  const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));
  applyTranslations(body, store, {});
  return { head, body, root };
}

function visibleText(root) {
  const out = [];
  (function walk(n) {
    for (const c of n.children) {
      if (c.type === 3) out.push(c.data);
      else if (c.type === 1) { if (c.name === 'br') out.push(' '); walk(c); }
    }
  })(root);
  return normalize(out.join(' '));
}

const a = render(backup);       // pipeline render from English
const b = render(current);      // the hand-patched page as shipped
const ta = visibleText(a.body);
const tb = visibleText(b.body);

const cjk = (t) => (t.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
console.log(`##### ${label}`);
console.log(`  pipeline-from-English : ${ta.length} chars, ${cjk(ta)} CJK`);
console.log(`  shipped (hand-patched): ${tb.length} chars, ${cjk(tb)} CJK`);
console.log(`  length delta: ${tb.length - ta.length}   CJK delta: ${cjk(tb) - cjk(ta)}`);

// where do they differ? show the first few differing slices
let i = 0;
const n = Math.min(ta.length, tb.length);
while (i < n && ta[i] === tb[i]) i++;
if (i === n && ta.length === tb.length) { console.log('  visible text: IDENTICAL'); process.exit(0); }
console.log(`  first difference at ${i}`);
console.log(`    pipeline: ...${JSON.stringify(ta.slice(Math.max(0, i - 60), i + 120))}`);
console.log(`    shipped : ...${JSON.stringify(tb.slice(Math.max(0, i - 60), i + 120))}`);
