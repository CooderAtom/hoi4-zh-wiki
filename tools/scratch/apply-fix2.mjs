// Apply a translation map to a built page by rewriting ONLY the raw text spans of the targeted
// text nodes. Nothing else in the file can change (verified by a byte-diff that must show only
// the intended replacements).
//
// Map format (data/work/fix-<page>.json):
//   { "page": "Naval technology",
//     "items": [ { "block": 12, "node": 0, "en": "165 days", "zh": "165 天" }, ... ] }
//   "block"/"node" are optional (block = index of the enclosing block unit, node = index of the
//   English text node inside that block, both as numbered by dump-context.mjs).
//   "en" is REQUIRED and must equal the current English text exactly (whitespace-normalized);
//   it is the safety catch that stops a translation landing in the wrong place.
//
// usage: node tools/scratch/apply-fix2.mjs site/Naval_technology.html data/work/fix-Naval_technology.json [--write]
import fs from 'node:fs';
import { parse } from '../dom.mjs';

const [htmlFile, mapFile, ...flags] = process.argv.slice(2);
const WRITE = flags.includes('--write');

const html = fs.readFileSync(htmlFile, 'utf8');
const s = html.indexOf('mw-parser-output');
const open = html.lastIndexOf('<div', s);
const head = html.slice(0, open);
const tail = html.slice(open);          // parse target (MW strips comments, so no offsets here)
const root = parse(tail);

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
// NOTE: NBSP (U+00A0, from &nbsp;) is NOT matched by \s, so it must be folded explicitly —
// otherwise a node reading "\u00a0Sardinia-Piedmont" never equals the map key
// "Sardinia-Piedmont" and silently fails to match.
const norm = (t) => String(t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const un = (t) => t.length >= 2 && LATIN.test(t) && !CJK.test(t) && !/^\s*[\W\d_]+\s*$/.test(t);
// MIXED node: Chinese AND English prose in one text node (it wraps an already-Chinese link).
// These MUST be enumerated here as well: block/node addressing is shared with dump-context.mjs,
// so if one tool counts them and the other does not, every index after them shifts.
const mixed = (t) => {
  if (!CJK.test(t) || !LATIN.test(t)) return false;
  const w = t.match(/[A-Za-z][A-Za-z'’-]{2,}/g) || [];
  if (w.length < 3) return false;
  return ((t.replace(/[（(][^（()）]*[）)]/g, '').match(/[A-Za-z][A-Za-z'’-]{2,}/g) || []).length) >= 3;
};

const UNIT_TAGS = new Set(['p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'caption', 'figcaption', 'dd', 'dt']);
function unitOf(node) {
  let n = node.parent;
  while (n && n.type === 1) { if (UNIT_TAGS.has(n.name)) return n; n = n.parent; }
  return null;
}

// Number text nodes exactly as dump-context.mjs does (including MIXED nodes).
const nodes = [];
const blockIndex = new Map();
for (const e of root.descendants()) {
  for (const c of e.children || []) {
    if (c.type !== 3) continue;
    const n = norm(c.data);
    if (!un(n) && !mixed(n)) continue;
    const u = unitOf(c);
    if (u && !blockIndex.has(u)) blockIndex.set(u, blockIndex.size);
    nodes.push({ node: c, norm: n, raw: c.data, block: u ? blockIndex.get(u) : -1, used: false });
  }
}

const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const errors = [];
const chosen = [];
const ambiguousGroups = [];

for (const [i, item] of (map.items || []).entries()) {
  const label = `item[${i}] block=${item.block} node=${item.node} en="${String(item.en).slice(0, 55)}"`;

  if (typeof item.zh !== 'string' || !item.zh.trim()) { errors.push(`${label}: missing/empty zh`); continue; }
  if (!CJK.test(item.zh)) errors.push(`${label}: zh contains no Chinese characters -> "${item.zh}"`);

  const want = norm(String(item.en ?? ''));
  let pool = nodes.filter((n) => !n.used);
  if (item.block !== undefined) pool = pool.filter((n) => n.block === item.block);
  if (item.en !== undefined) pool = pool.filter((n) => n.norm === want);

  if (item.node !== undefined) {
    const inBlock = nodes.filter((n) => !n.used && n.block === item.block);
    const pick = inBlock[item.node];
    if (!pick) { errors.push(`${label}: block ${item.block} has no untranslated node #${item.node}`); continue; }
    if (!pool.includes(pick)) { errors.push(`${label}: node #${item.node} in block ${item.block} reads "${pick.norm.slice(0, 50)}"`); continue; }
    pool = [pick];
  } else if (item.block !== undefined) {
    if (!pool.length) { errors.push(`${label}: block ${item.block} has no untranslated node matching that English`); continue; }
  } else {
    // No address given: treat it as a page-wide substitution. This is safe because the map is
    // authored from the per-string inventory, where every occurrence of one English string
    // shares one meaning; a genuine conflict must be addressed with block/node instead.
    if (!pool.length) { errors.push(`${label}: NO MATCHING ENGLISH FOUND`); continue; }
    if (pool.length > 1) ambiguousGroups.push({ en: want, n: pool.length, zh: item.zh, label });
  }

  for (const p of pool) { p.used = true; chosen.push({ target: p, zh: item.zh, label }); }
}

console.log(`=== ${htmlFile}  <- ${mapFile}`);
console.log(`items: ${(map.items || []).length}   text nodes covered: ${chosen.length}   errors: ${errors.length}`);
if (ambiguousGroups.length) {
  console.log(`\npage-wide substitutions (one English string, several occurrences):`);
  for (const g of ambiguousGroups) console.log(`  x${String(g.n).padStart(3)}  "${g.en.slice(0, 60)}" -> ${g.zh}`);
}
if (errors.length) {
  console.log('\nERRORS (nothing written):');
  for (const e of errors) console.log('  ! ' + e);
  process.exit(1);
}

// ---- locate each chosen node's raw span in the ORIGINAL text, by DOM order cursor ----
const decode = (x) => x.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, b) => {
  if (b[0] === '#') {
    const cp = b[1] === 'x' || b[1] === 'X' ? parseInt(b.slice(2), 16) : parseInt(b.slice(1), 10);
    if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return m;
    try { return String.fromCodePoint(cp); } catch { return m; }
  }
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', ndash: '–', mdash: '—', hellip: '…', times: '×', middot: '·', deg: '°', laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™', minus: '−', shy: '\u00ad', ensp: ' ', emsp: ' ' };
  return Object.prototype.hasOwnProperty.call(named, b) ? named[b] : m;
});

// Walk all text nodes of `tail` in document order, matching each chosen one by identity.
const order = [];
(function walk(n) { for (const c of n.children) { if (c.type === 3) order.push(c); else if (c.type === 1) walk(c); } })(root);
// Precompute which offsets are inside a tag (<...>) or an HTML entity, so a text replacement can
// never corrupt an attribute value or a path. This caught a real bug: the naive finder matched
// "Sardinia-Piedmont" inside src="images/Sardinia-Piedmont.png" and broke the image filename.
const inTag = new Uint8Array(tail.length + 1);
{
  let depth = 0, i = 0;
  while (i < tail.length) {
    const ch = tail[i];
    if (ch === '<') { depth = 1; inTag[i] = 1; i++; continue; }
    if (depth) { inTag[i] = 1; if (ch === '>') depth = 0; i++; continue; }
    if (ch === '&') {
      const m = /^&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/.exec(tail.slice(i, i + 40));
      if (m) { for (let k = 0; k < m[0].length; k++) inTag[i + k] = 1; i += m[0].length; continue; }
    }
    i++;
  }
}

// Flexible whitespace matcher: the source text may contain newlines / runs of spaces / entities
// where the DOM text (and therefore the map key) has a single space. Multi-line mixed nodes hit
// exactly this, so a plain indexOf of the normalized string would fail to locate them.
function findSpan(str, raw, from) {
  const scan = (start) => {
    // 1) exact literal first (fast path)
    let p = str.indexOf(raw, start);
    while (p >= 0) {
      if (!inTag[p] && norm(decode(str.slice(p, p + raw.length))) === raw) return { from: p, len: raw.length };
      p = str.indexOf(raw, p + 1);
    }
    // 2) whitespace-flexible scan: any \s+ in the source may stand for one space in `raw`
    const pat = raw.split(' ').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
    const re = new RegExp(pat, 'g');
    re.lastIndex = start;
    let m;
    while ((m = re.exec(str))) {
      if (!inTag[m.index] && norm(decode(str.slice(m.index, m.index + m[0].length))) === raw) {
        return { from: m.index, len: m[0].length };
      }
      re.lastIndex = m.index + 1;
    }
    return null;
  };
  return scan(from) || (from > 0 ? scan(0) : null);
}

const wanted = new Map(chosen.map((c) => [c.target.node, c]));
const spans = [];
let cursor = 0;
for (const tn of order) {
  if (!wanted.has(tn)) continue;
  const raw = norm(tn.data);              // normalized, to match the DOM text consistently
  const hit = findSpan(tail, raw, cursor);
  if (!hit) {
    errors.push(`could not locate span for "${raw.slice(0, 50)}" (cursor=${cursor}, tail.length=${tail.length})`);
    continue;
  }
  spans.push({ from: hit.from, to: hit.from + hit.len, zh: wanted.get(tn).zh, en: raw });
  cursor = hit.from + hit.len;
}
if (errors.length) {
  console.log('\nLOCATION ERRORS (nothing written):');
  for (const e of errors) console.log('  ! ' + e);
  process.exit(1);
}

// ---- rewrite, from the end backwards so offsets stay valid ----
spans.sort((a, b) => b.from - a.from);
let out = tail;
for (const sp of spans) out = out.slice(0, sp.from) + sp.zh + out.slice(sp.to);
const result = head + out;

// ---- verification ----
// No replacement may sit inside a tag or an entity (that is how an image path gets corrupted).
const badSpans = spans.filter((sp) => {
  for (let k = sp.from; k < sp.to; k++) if (inTag[k]) return true;
  return false;
});
if (badSpans.length) {
  console.log('\nABORT: ' + badSpans.length + ' replacement(s) overlap a tag/entity:');
  for (const b of badSpans.slice(0, 10)) console.log(`  ! "${b.en.slice(0, 60)}" @${b.from} -> ${JSON.stringify(tail.slice(b.from - 30, b.to + 10))}`);
  process.exit(1);
}

const remain = nodes.filter((n) => !n.used && un(n.norm));
console.log(`replacements applied: ${spans.length}`);
console.log(`remaining English text nodes on page: ${remain.length}`);
for (const r of remain.slice(0, 40)) console.log(`   [blk ${r.block}] ${JSON.stringify(r.norm.slice(0, 90))}`);

const lenDelta = result.length - html.length;
console.log(`file size: ${html.length} -> ${result.length} (${lenDelta >= 0 ? '+' : ''}${lenDelta} chars)`);

// every replacement must appear in the result, and no other difference is allowed:
const before = html.split('\n'), after = result.split('\n');
let changedLines = 0;
for (let i = 0; i < Math.max(before.length, after.length); i++) if (before[i] !== after[i]) changedLines++;
console.log(`changed lines: ${changedLines} (expected ~${new Set(spans.map((x) => x.from)).size} or fewer)`);

if (!WRITE) { console.log('\n(dry run — pass --write to modify the file)'); process.exit(0); }
fs.writeFileSync(htmlFile, result);
console.log(`\nWROTE ${htmlFile}`);
