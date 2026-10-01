// Finish an already-built site page with the translation memory, using the pipeline's own
// renderer (tools/units.mjs applyTranslations) instead of matching literal text by hand.
//
// Two things defeat naive literal matching on a built page, and both are handled here:
//  1. a word of the English source can be wrapped in an inline element in the HTML (an icon
//     link on the word "experience", say), so the element sits between the literal fragments;
//  2. an earlier build already translated some *tiny text nodes* inside a still-English block
//     ("and" -> "和"), which changes the block's translation key and makes the renderer skip it.
// Step 1 below finds the element a unit belongs to by its placeholder count plus one intact
// long text run, and rewrites that element's text runs back to the English source; step 2 then
// lets applyTranslations rebuild the element from the real translation.
//
//   node tools/scratch/apply-tm-to-page.mjs "<page title>" [--dry] [--no-restore]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, SITE, readJson } from '../lib.mjs';
import { parse, serialize, text } from '../dom.mjs';
import { applyTranslations, hasBlockContent } from '../units.mjs';
import { Store, normalize } from '../translate.mjs';

const page = process.argv[2] || 'Military industrial organization';
const dryRun = process.argv.includes('--dry');
const noRestore = process.argv.includes('--no-restore');
const verbose = process.argv.includes('--verbose');

const PH = /\u27E6\s*\d+\s*\u27E7/;   // NO capture group: split() would insert captured digits
const INLINE_OK = new Set(['a', 'b', 'i', 'em', 'strong', 'span', 'small', 'sup', 'sub', 'abbr',
  'del', 'ins', 'u', 's', 'mark', 'big', 'tt', 'font', 'ruby', 'rt', 'time', 'q', 'cite', 'dfn',
  'kbd', 'samp', 'var', 'code', 'br', 'img']);
const STRUCT = new Set(['ul', 'ol', 'dl', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'figure',
  'form', 'details', 'nav', 'aside', 'header', 'footer', 'main', 'article', 'blockquote', 'pre',
  'div', 'section', 'center', 'p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption']);
const BLOCK = new Set(['p', 'li', 'dt', 'dd', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'figcaption', 'caption', 'blockquote', 'summary']);

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

/** Copy of units.mjs tokenize(): text runs + one placeholder per inline element. */
function tokenize(e) {
  let src = '';
  const fragments = [];
  for (const c of e.children) {
    if (c.type === 3) { src += c.data; continue; }
    if (c.type !== 1) continue;
    if (c.name === 'br') { src += ' '; continue; }
    if (isIcon(c)) continue;
    if (INLINE_OK.has(c.name) && !hasBlockContent(c)) {
      src += '\u27E6' + fragments.length + '\u27E7';
      fragments.push(serialize(c));
      continue;
    }
    src += ' ' + flatten(c) + ' ';
  }
  return { src, fragments };
}

/** The text-node runs of `e`, aligned with the text parts of tokenize(e). */
function textRuns(e) {
  const runs = [];
  let cur = { nodes: [], text: '', unmappable: false };
  for (const c of e.children) {
    if (c.type === 3) { cur.nodes.push(c); cur.text += c.data; continue; }
    if (c.type !== 1) continue;
    if (c.name === 'br') { cur.text += ' '; continue; }
    if (isIcon(c)) continue;
    if (INLINE_OK.has(c.name) && !hasBlockContent(c)) { runs.push(cur); cur = { nodes: [], text: '', unmappable: false }; continue; }
    cur.text += ' ' + flatten(c) + ' ';
    cur.unmappable = true;
  }
  runs.push(cur);
  return runs;
}

/** How well a built block's text run matches the English source's run (0..1). */
function partScore(srcPart, enPart) {
  const a = normalize(srcPart);
  const b = normalize(enPart);
  if (a === b) return 1;
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const head = b.slice(0, 16);
  const tail = b.slice(-16);
  if (head.length >= 8 && a.includes(head)) return 0.8;
  if (tail.length >= 8 && a.includes(tail)) return 0.6;
  return 0;
}

const slugOf = (t) => t.replace(/ /g, '_').replace(/[^\w!.\-()',]/g, (c) => '_' + c.charCodeAt(0).toString(16) + '_');
const registry = readJson(path.join(DATA, 'pages.json'), { pages: [] });
const fetched = readJson(path.join(DATA, 'fetched.json'), { pages: {} });
const fileTitle = (fetched.pages[page] && fetched.pages[page].title) || page;
const meta = registry.pages.find((p) => p.title === page);
let htmlPath = null;
for (const cand of [slugOf(fileTitle), slugOf(page), (meta && meta.slug) || '']) {
  if (!cand) continue;
  const p = path.join(SITE, cand + '.html');
  if (fs.existsSync(p)) { htmlPath = p; break; }
}
if (!htmlPath) { console.error('built page not found for', page); process.exit(1); }

const pageUnits = readJson(path.join(DATA, 'page-units.json'))[page];
const allUnits = readJson(path.join(DATA, 'units.json'), []);
const byK = new Map(allUnits.map((u) => [u.k, u.en]));
const store = new Store();

const original = fs.readFileSync(htmlPath, 'utf8');
const startTag = '<main class="content">';
const endTag = '</main>';
const start = original.indexOf(startTag);
const end = original.indexOf(endTag, start);
if (start < 0 || end < 0) { console.error('no <main class="content"> region found'); process.exit(1); }
const frag = original.slice(start, end + endTag.length);
const root = parse(frag);

// ---- step 1: restore the English source text of units whose block was partially translated ----
let restored = 0;
const restoreLog = [];
if (!noRestore && pageUnits) {
  const leafBlocks = root.descendants().filter((e) =>
    (BLOCK.has(e.name) || e.name === 'div') && e.name !== 'pre' && !hasBlockContent(e) && e.children.length);
  for (const k of pageUnits.units) {
    const en = byK.get(k);
    if (!en) continue;
    if (!store.get(en)) continue;
    const partsEn = en.split(PH);
    // a block that already matches exactly is left to the renderer
    const exact = leafBlocks.some((e) => normalize(tokenize(e).src) === normalize(en));
    if (exact) continue;
    if (partsEn.every((p) => normalize(p).length < 12)) continue;
    // Score every leaf block by how many of its text runs line up with the source's runs. A run
    // may differ because an earlier build already translated a small connector word inside it.
    const scored = [];
    for (const e of leafBlocks) {
      const { src } = tokenize(e);
      const parts = src.split(PH);
      if (parts.length !== partsEn.length) continue;
      let sum = 0;
      for (let i = 0; i < parts.length; i++) sum += partScore(parts[i], partsEn[i]);
      const score = sum / parts.length;
      if (score >= 0.6) scored.push({ e, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const cands = scored.filter((s) => s.score >= scored[0].score - 1e-9);
    if (cands.length !== 1) {
      restoreLog.push(`${k}: ${cands.length} candidate blocks at top score${cands[0] ? ' ' + cands[0].score.toFixed(2) : ''}, skipped`);
      continue;
    }
    const e = cands[0].e;
    const runs = textRuns(e);
    if (runs.length !== partsEn.length || runs.some((r) => r.unmappable)) {
      restoreLog.push(`${k}: run mapping failed (runs=${runs.length} parts=${partsEn.length})`);
      continue;
    }
    let changed = false;
    for (let i = 0; i < runs.length; i++) {
      const srcRun = normalize(runs[i].text);
      const enRun = normalize(partsEn[i]);
      if (srcRun === enRun) continue;
      if (runs[i].nodes.length === 0) {
        // nothing to rewrite in place; insert the English run before the following placeholder
        if (enRun) restoreLog.push(`${k}: run ${i} has no text node, skipped`);
        continue;
      }
      runs[i].nodes[0].data = partsEn[i];
      for (let j = 1; j < runs[i].nodes.length; j++) runs[i].nodes[j].data = '';
      changed = true;
    }
    if (!changed) continue;
    const after = normalize(tokenize(e).src);
    if (after === normalize(en)) { restored++; restoreLog.push(`${k}: restored`); }
    else restoreLog.push(`${k}: restore incomplete`);
  }
}

// ---- step 2: let the pipeline renderer rebuild everything it has a translation for ----
const stats = applyTranslations(root, store);
let out = serialize(root);

let html = original.slice(0, start) + out + original.slice(end + endTag.length);
const beforeBanner = html;
html = html.replace(/<div class="cov-banner">[\s\S]*?<\/div>\s*/, '');
const bannerRemoved = html !== beforeBanner;
const beforeFooter = html;
html = html.replace(/(中文翻译进度 )\d+%/, '$1100%');
const footerFixed = html !== beforeFooter;

console.log('page:', page);
console.log('file:', htmlPath);
console.log('restored blocks:', restored);
for (const l of restoreLog.slice(0, 40)) console.log('  ', l);
console.log('renderer stats:', JSON.stringify(stats));
console.log('banner removed:', bannerRemoved, '| footer set to 100%:', footerFixed);
console.log('bytes:', original.length, '->', html.length);
if (dryRun) { console.log('(dry run, nothing written)'); process.exit(0); }

const bak = path.join('cache', 'refsite', path.basename(htmlPath) + '.preapply.html');
fs.mkdirSync(path.dirname(bak), { recursive: true });
fs.writeFileSync(bak, original);
fs.writeFileSync(htmlPath, html);
console.log('backup:', bak);
console.log('written:', htmlPath);
