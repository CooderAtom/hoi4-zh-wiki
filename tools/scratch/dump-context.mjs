// Dump every text node that still reads as English in a built page, with surrounding
// context so a translator can render the WHOLE sentence/paragraph coherently.
// Output: data/work/ctx-<page>.json  +  a readable .txt
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../dom.mjs';

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const s = html.indexOf('mw-parser-output');
const root = parse(html.slice(html.lastIndexOf('<div', s)));

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const un = (t) => t.length >= 2 && LATIN.test(t) && !CJK.test(t) && !/^\s*[\W\d_]+\s*$/.test(t);
// MIXED node: contains Chinese AND English prose. These were a blind spot — `un()` rejects
// anything containing CJK, so an English sentence that *wraps* an already-Chinese link was
// reported as neither untranslated nor remaining. Flagged so a translator can see them.
const mixed = (t) => {
  if (!CJK.test(t) || !LATIN.test(t)) return false;
  const words = t.match(/[A-Za-z][A-Za-z'’-]{2,}/g) || [];
  if (words.length < 3) return false;
  return !!(t.replace(/[（(][^（()）]*[）)]/g, '').match(/[A-Za-z][A-Za-z'’-]{2,}/g) || []).length >= 3;
};

// Nearest enclosing "block" element that will be treated as one translation unit.
// Start from the text node itself and walk up, so a node that sits DIRECTLY in a <td>
// reports the <td>, not its parent <tr>.
const UNIT_TAGS = new Set(['p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'caption', 'figcaption', 'dd', 'dt']);
const SKIP = new Set(['b', 'i', 'em', 'strong', 'span', 'a', 'small', 'sup', 'sub', 'font', 'center', 'u', 's']);
function unitOf(node) {
  let n = node.parent;                // walk up from the text node's parent element
  while (n && n.type === 1) {
    if (UNIT_TAGS.has(n.name)) return n;
    n = n.parent;
  }
  return null;
}

const render = (el) => el.textContent.replace(/\s+/g, ' ').trim();

const nodes = [];
const seenUnits = new Set();
const units = [];
let mixedCount = 0;
for (const e of root.descendants()) {
  for (const c of e.children || []) {
    if (c.type !== 3) continue;
    const t = c.data.replace(/\s+/g, ' ').trim();
    const isMixed = mixed(t);
    if (!un(t) && !isMixed) continue;
    if (isMixed && !un(t)) mixedCount++;
    const u = unitOf(c);
    nodes.push({ text: c.data, norm: t, unit: u ? render(u).slice(0, 2000) : null, tag: e.name, mixed: isMixed });
    if (u && !seenUnits.has(u)) { seenUnits.add(u); units.push({ tag: u.name, id: u.attr('id') || null, html: (u.serialize ? u.serialize() : null) }); }
  }
}

const base = path.basename(file, '.html');
fs.mkdirSync('data/work', { recursive: true });
fs.writeFileSync(`data/work/ctx-${base}.json`, JSON.stringify({ file, nodes, unitCount: units.length }, null, 1));

const lines = [];
lines.push(`PAGE ${base}  —  ${nodes.length} text nodes needing work in ${units.length} block units`);
lines.push(`  (of these, ${mixedCount} are MIXED: the node contains Chinese AND English. A MIXED node`);
lines.push(`   wraps an already-Chinese link, so translate ONLY its English part and keep the`);
lines.push(`   surrounding Chinese exactly as-is.)`);
lines.push('');
let lastUnit = null;
for (const n of nodes) {
  if (n.unit !== lastUnit) { lastUnit = n.unit; lines.push(`\n----- BLOCK (read this as one sentence) -----\n${n.unit}`); }
  lines.push(`   [${n.tag}]${n.mixed ? ' [MIXED]' : ''} ${JSON.stringify(n.norm)}`);
}
fs.writeFileSync(`data/work/ctx-${base}.txt`, lines.join('\n'));
console.log(`ctx-${base}.json / .txt written: ${nodes.length} nodes (${mixedCount} mixed), ${units.length} blocks`);
