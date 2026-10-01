// Diagnose why restore/render does not pick up a unit on a built page.
//   node tools/scratch/unit-debug.mjs <key> [pageSlug]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, SITE, readJson } from '../lib.mjs';
import { parse, serialize } from '../dom.mjs';
import { hasBlockContent } from '../units.mjs';
import { Store, normalize } from '../translate.mjs';

const key = process.argv[2];
const slugName = process.argv[3] || 'Military_industrial_organization';
const units = readJson(path.join(DATA, 'units.json'), []);
const u = units.find((x) => x.k === key);
if (!u) { console.error('no unit', key); process.exit(1); }
const store = new Store();
const zh = store.get(u.en);
console.log('key:', key, '| ctx:', u.ctx, '| frags:', u.frags);
console.log('TM translation:', zh ? JSON.stringify(zh.slice(0, 80)) : 'NONE');
console.log('en:', JSON.stringify(u.en.slice(0, 160)));

const html = fs.readFileSync(path.join(SITE, slugName + '.html'), 'utf8');
const start = html.indexOf('<main class="content">');
const end = html.indexOf('</main>', start);
const root = parse(html.slice(start, end + 8));

const INLINE_OK = new Set(['a', 'b', 'i', 'em', 'strong', 'span', 'small', 'sup', 'sub', 'abbr', 'del', 'ins', 'u', 's', 'mark', 'big', 'tt', 'font', 'ruby', 'rt', 'time', 'q', 'cite', 'dfn', 'kbd', 'samp', 'var', 'code', 'br', 'img']);
const STRUCT = new Set(['ul', 'ol', 'dl', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'figure', 'form', 'details', 'nav', 'aside', 'header', 'footer', 'main', 'article', 'blockquote', 'pre', 'div', 'section', 'center', 'p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption']);
const BLOCK = new Set(['p', 'li', 'dt', 'dd', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption', 'caption', 'blockquote', 'summary']);
const isIcon = (e) => {
  if (e.name === 'img') return true;
  if (e.name === 'a') {
    const kids = e.children.filter((c) => c.type === 1 || (c.type === 3 && c.data.trim()));
    return kids.length > 0 && kids.every((c) => c.type === 1 && c.name === 'img');
  }
  return false;
};
const flatten = (n) => {
  let out = '';
  for (const c of n.children) {
    if (c.type === 3) { out += c.data; continue; }
    if (c.type !== 1) continue;
    if (c.name === 'br') { out += ' '; continue; }
    if (isIcon(c)) continue;
    if (STRUCT.has(c.name)) out += ' ' + flatten(c) + ' ';
    else out += flatten(c);
  }
  return out;
};
function tokenize(e) {
  let src = '';
  const fragments = [];
  for (const c of e.children) {
    if (c.type === 3) { src += c.data; continue; }
    if (c.type !== 1) continue;
    if (c.name === 'br') { src += ' '; continue; }
    if (isIcon(c)) continue;
    if (INLINE_OK.has(c.name) && !hasBlockContent(c)) { src += '\u27E6' + fragments.length + '\u27E7'; fragments.push(serialize(c)); continue; }
    src += ' ' + flatten(c) + ' ';
  }
  return { src, fragments };
}

const partsEn = u.en.split(/\u27E6\s*\d+\s*\u27E7/);
const longest = partsEn.reduce((a, b) => (b.trim().length > a.trim().length ? b : a), '');
console.log('parts:', partsEn.length, '| longest part len:', longest.length);
console.log('longest head:', JSON.stringify(normalize(longest).slice(0, 100)));

const leafBlocks = root.descendants().filter((e) => (BLOCK.has(e.name) || e.name === 'div') && e.name !== 'pre' && !hasBlockContent(e) && e.children.length);
let report = 0;
for (const e of leafBlocks) {
  const { src } = tokenize(e);
  const ph = (src.match(/\u27E6\d+\u27E7/g) || []).length;
  const hasNeedle = normalize(src).includes(normalize(longest));
  const exact = normalize(src) === normalize(u.en);
  if (ph === partsEn.length - 1 || hasNeedle || exact) {
    console.log(`candidate <${e.name}> ph=${ph} needle=${hasNeedle} exact=${exact}`);
    console.log('   src:', JSON.stringify(normalize(src).slice(0, 220)));
    if (++report > 6) break;
  }
}
console.log('leaf blocks scanned:', leafBlocks.length);
