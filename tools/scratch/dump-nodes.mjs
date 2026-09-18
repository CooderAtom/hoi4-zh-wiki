// Dump every untranslated text node of a page WITH its exact byte offset, so a patch map
// can be applied by offset (no DOM re-serialization, no ambiguity from repeated strings).
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { normalize } from '../translate.mjs';

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const s = html.indexOf('mw-parser-output');
const open = html.lastIndexOf('<div', s);
const root = parse(html.slice(open));

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const un = (t) => t.length >= 2 && LATIN.test(t) && !CJK.test(t) && !/^\s*[\W\d_]+\s*$/.test(t);

const out = [];
for (const e of root.descendants()) {
  for (const c of e.children || []) {
    if (c.type !== 3) continue;
    const t = normalize(c.data);
    if (!un(t)) continue;
    const start = c.__start, end = c.__end;
    if (typeof start !== 'number') { console.error('NO OFFSET for', t.slice(0, 40)); continue; }
    // parent chain
    let p = e, chain = [];
    while (p && p.type === 1 && chain.length < 4) { chain.unshift(p.name + (p.attr && p.attr('id') ? '#' + p.attr('id') : '')); p = p.parent; }
    out.push({ start, end, raw: c.data, text: t, in: chain.join('>') });
  }
}
console.log(`nodes: ${out.length}`);
fs.mkdirSync('data/work', { recursive: true });
const outFile = `data/work/nodes-${file.replace(/[\\/]/g, '_')}.json`;
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log('written ->', outFile);
for (const n of out.slice(0, Number(process.argv[3] || 60))) {
  console.log(`\n@${n.start}-${n.end} [${n.in}]\n  ${JSON.stringify(n.text)}`);
}
