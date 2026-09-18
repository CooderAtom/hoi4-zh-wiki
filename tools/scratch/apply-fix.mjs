// Apply a translation map to a built page by replacing individual text nodes in place.
//
// Why index-based: strings like "165 days" or "Unlocks" occur many times and two occurrences
// can need different Chinese. So the map addresses the Nth English text node of the block,
// exactly as dump-context.mjs numbered them.
//
// Map format (data/work/fix-<page>.json):
//   { "page": "Naval technology",
//     "items": [ { "block": 12, "node": 0, "en": "165 days", "zh": "165 天" }, ... ] }
//   - "block"/"node" optional; without them the first still-English occurrence is used.
//   - "en" is REQUIRED and must equal the current English text exactly (whitespace-normalized);
//     it acts as the safety catch that stops a translation landing in the wrong place.
//
// Safety: verifies every item, aborts if any check fails, and only then rewrites the file.
// usage: node tools/scratch/apply-fix.mjs site/Naval_technology.html data/work/fix-Naval_technology.json [--write]
import fs from 'node:fs';
import { parse } from '../dom.mjs';

const [htmlFile, mapFile, ...flags] = process.argv.slice(2);
const WRITE = flags.includes('--write');

const html = fs.readFileSync(htmlFile, 'utf8');
const s = html.indexOf('mw-parser-output');
const open = html.lastIndexOf('<div', s);
const root = parse(html.slice(open));

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const un = (t) => t.length >= 2 && LATIN.test(t) && !CJK.test(t) && !/^\s*[\W\d_]+\s*$/.test(t);

const UNIT_TAGS = new Set(['p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'caption', 'figcaption', 'dd', 'dt']);
function unitOf(node) {
  let n = node.parent;
  while (n && n.type === 1) { if (UNIT_TAGS.has(n.name)) return n; n = n.parent; }
  return null;
}

// Walk exactly like dump-context.mjs so block/node numbering matches.
const nodes = [];
const blockIndex = new Map();
for (const e of root.descendants()) {
  for (const c of e.children || []) {
    if (c.type !== 3) continue;
    const norm = c.data.replace(/\s+/g, ' ').trim();
    if (!un(norm)) continue;
    const u = unitOf(c);
    if (u && !blockIndex.has(u)) blockIndex.set(u, blockIndex.size);
    nodes.push({ node: c, norm, block: u ? blockIndex.get(u) : -1, used: false });
  }
}

const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const errors = [];
const applied = [];

for (const [i, item] of (map.items || []).entries()) {
  const label = `item[${i}] block=${item.block} node=${item.node} en="${String(item.en).slice(0, 60)}"`;
  if (typeof item.zh !== 'string' || !item.zh.trim()) { errors.push(`${label}: missing/empty zh`); continue; }
  if (CJK.test(item.zh) === false) errors.push(`${label}: zh has no Chinese characters (${item.zh})`);

  let cands = nodes.filter((n) => !n.used);
  if (item.block !== undefined) cands = cands.filter((n) => n.block === item.block);
  if (item.en !== undefined) {
    const want = String(item.en).replace(/\s+/g, ' ').trim();
    cands = cands.filter((n) => n.norm === want);
  }
  if (item.node !== undefined) {
    const wantB = item.block;
    const inBlock = nodes.filter((n) => !n.used && n.block === wantB);
    const pick = inBlock[item.node];
    if (!pick) { errors.push(`${label}: no node #${item.node} in block ${wantB}`); continue; }
    if (!cands.includes(pick)) { errors.push(`${label}: node #${item.node} in block ${wantB} is "${pick.norm.slice(0, 50)}", not the requested English`); continue; }
    cands = [pick];
  }
  if (!cands.length) { errors.push(`${label}: NO MATCHING ENGLISH TEXT FOUND`); continue; }
  if (cands.length > 1) { errors.push(`${label}: AMBIGUOUS — ${cands.length} candidates; add "block"/"node"`); continue; }

  const target = cands[0];
  const orig = target.node.data;
  const lead = orig.match(/^\s*/)[0];
  const trail = orig.match(/\s*$/)[0];
  target.node.data = lead + item.zh + trail;
  target.used = true;
  applied.push({ block: target.block, en: target.norm, zh: item.zh });
}

console.log(`=== ${htmlFile}  <- ${mapFile}`);
console.log(`items: ${(map.items || []).length}   applied: ${applied.length}   errors: ${errors.length}`);
if (errors.length) {
  console.log('\nERRORS (nothing written):');
  for (const e of errors) console.log('  ! ' + e);
  process.exit(1);
}

// Report what remains untranslated.
const remaining = nodes.filter((n) => !n.used && un(n.node.data.replace(/\s+/g, ' ').trim()));
console.log(`remaining English text nodes on page: ${remaining.length}`);
for (const r of remaining.slice(0, 40)) console.log(`   [blk ${r.block}] ${JSON.stringify(r.norm.slice(0, 90))}`);

if (!WRITE) { console.log('\n(dry run — pass --write to modify the file)'); process.exit(0); }

// Recheck: we must not have introduced or lost structure. We rewrite the whole file by
// splicing the ORIGINAL text spans, so everything outside them stays byte-identical.
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = html.slice(0, open) + serializePreserving(root, esc) + html.slice(html.length);
console.log('\nNOTE: offset splice path not used; see apply-fix2 for the byte-safe writer.');
process.exit(0);

function serializePreserving() { throw new Error('unused'); }
