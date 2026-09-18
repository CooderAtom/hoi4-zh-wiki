// List the text nodes that stay English after the pipeline runs on an English source page,
// with enough context to see what they are.
import fs from 'node:fs';
import { parse, serialize } from '../dom.mjs';
import { applyTranslations } from '../units.mjs';
import { Store } from '../translate.mjs';

const store = new Store();
const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const s = html.indexOf('mw-parser-output');
const tail = html.slice(html.lastIndexOf('<div', s), html.indexOf('</main>', s));
const root = parse(tail);
const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));
const st = applyTranslations(body, store, {});
console.log(`ratio=${(st.ratio * 100).toFixed(1)}%  nodes=${st.nodes} done=${st.done}`);
console.log(`stats: ${JSON.stringify({ blocks: st.blocks, texts: st.texts, inlines: st.inlines, attrs: st.attrs })}`);

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const norm = (t) => String(t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const un = (t) => t.length >= 2 && LATIN.test(t) && !CJK.test(t) && !/^\s*[\W\d_]+\s*$/.test(t);

const left = [];
for (const e of root.descendants()) {
  for (const c of e.children || []) {
    if (c.type !== 3) continue;
    const t = norm(c.data);
    if (!un(t)) continue;
    left.push(`<${e.name}> ${JSON.stringify(t.slice(0, 120))}`);
  }
}
console.log(`\nleftover English text nodes: ${left.length}`);
for (const l of left.slice(0, 45)) console.log('   ' + l);
