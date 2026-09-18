// Emit the authoritative block/node table for every untranslated text node of a page,
// so fix maps can address duplicates deterministically.
// usage: node tools/scratch/table.mjs site/Navy.html [outfile]
import fs from 'node:fs';
import { parse } from '../dom.mjs';

const file = process.argv[2];
const outFile = process.argv[3] || `data/work/table-${file.split(/[\\/]/).pop().replace('.html', '')}.json`;
const html = fs.readFileSync(file, 'utf8');
const s = html.indexOf('mw-parser-output');
const root = parse(html.slice(html.lastIndexOf('<div', s)));

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const un = (t) => t.length >= 2 && LATIN.test(t) && !CJK.test(t) && !/^\s*[\W\d_]+\s*$/.test(t);

const UNIT_TAGS = new Set(['p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'caption', 'figcaption', 'dd', 'dt']);
const unitOf = (node) => { let n = node.parent; while (n && n.type === 1) { if (UNIT_TAGS.has(n.name)) return n; n = n.parent; } return null; };

// block index = order of first appearance; node index = position of the English text node in the block
const blockIndex = new Map();
const blockNodes = new Map();
const rows = [];
for (const e of root.descendants()) {
  for (const c of e.children || []) {
    if (c.type !== 3) continue;
    const n = norm(c.data);
    if (!un(n)) continue;
    const u = unitOf(c);
    const b = u ? (blockIndex.has(u) ? blockIndex.get(u) : (blockIndex.set(u, blockIndex.size), blockIndex.get(u))) : -1;
    if (!blockNodes.has(b)) blockNodes.set(b, []);
    const idx = blockNodes.get(b).length;
    blockNodes.get(b).push(n);
    let chain = [], p = e;
    while (p && p.type === 1 && chain.length < 3) { chain.unshift(p.name); p = p.parent; }
    rows.push({ block: b, node: idx, tag: chain.join('>'), en: n });
  }
}

fs.mkdirSync('data/work', { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ page: file, rows }, null, 1));
console.log(`table written -> ${outFile}   rows=${rows.length}`);
let lastB = null;
for (const r of rows) {
  if (r.block !== lastB) { console.log(`\n  -- block ${r.block} --`); lastB = r.block; }
  console.log(`   [${r.node}] <${r.tag}> ${JSON.stringify(r.en.slice(0, 120))}`);
}
