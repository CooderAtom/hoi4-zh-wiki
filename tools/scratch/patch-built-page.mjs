// Patch an already-built site page in place by re-applying translations the TM holds for
// that page. Needed because cache/pages/ (the raw wiki HTML) is gone and the wiki host
// answers 427, so 07-build.mjs cannot run any more.
//
//   node tools/scratch/patch-built-page.mjs "<page title>" --list   # what is still English
//   node tools/scratch/patch-built-page.mjs "<page title>" --dry    # show what would change
//   node tools/scratch/patch-built-page.mjs "<page title>"          # patch (keeps a backup)
//
// Matching is linear (indexOf + whitespace-tolerant literal walk, no regex scanning).
//  * whole-text-node / whole-attribute units are matched for every unit of the page; such a
//    match can only ever replace one complete text node, so it cannot corrupt neighbouring text;
//  * placeholder units are only aligned for keys that were exported as a translation block
//    for this very page, because a generic unit like "⟦0⟧ in ⟦1⟧." would otherwise match all
//    over the document: the span between two literals becomes that placeholder's markup.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, SITE, readJson } from '../lib.mjs';
import { Store } from '../translate.mjs';

const page = process.argv[2] || 'Military industrial organization';
const dryRun = process.argv.includes('--dry');
const listMode = process.argv.includes('--list');
const MAX_GAP = 600;      // longest span a single placeholder may cover in rendered HTML
const MAX_HITS = 500;     // safety cap on occurrences handled per unit

const pageUnits = readJson(path.join(DATA, 'page-units.json'))[page];
if (!pageUnits) { console.error('no page-units entry for:', page); process.exit(1); }
const units = readJson(path.join(DATA, 'units.json'), []);
const byK = new Map(units.map((u) => [u.k, u.en]));
const store = new Store();

// --- keys exported as a block for this page: the only ones safe for placeholder matching ---
const blockKeys = new Set();
const pageblocksDir = path.join(DATA, 'pageblocks');
for (const f of fs.existsSync(pageblocksDir) ? fs.readdirSync(pageblocksDir) : []) {
  if (!/\.zh\.json$/.test(f)) continue;
  const b = readJson(path.join(pageblocksDir, f));
  if (b && b.page === page) for (const it of b.items || []) blockKeys.add(it.k);
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

let html = fs.readFileSync(htmlPath, 'utf8');
const original = html;
const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');
const isWs = (c) => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';

const allItems = [];
for (const k of pageUnits.units) {
  const en = byK.get(k);
  if (en) allItems.push({ k, en, zh: store.get(en) || '', ph: /\u27E6\d+\u27E7/.test(en) });
}
const patchable = allItems.filter((i) => i.zh && i.zh !== i.en);

/** Find `lit` in `src` from `from`, letting any whitespace run in `lit` match any run in `src`.
 *  Leading/trailing whitespace of the literal is treated as a boundary assertion, never as an
 *  empty first token (an empty token would make indexOf walk the string one character at a time). */
function indexOfWs(src, lit, from) {
  if (lit === '') return { start: from, end: from };
  const lead = /^\s*/.exec(lit)[0];
  const trail = /\s*$/.exec(lit)[0];
  const core = lit.slice(lead.length, lit.length - trail.length);
  if (core === '') return { start: from, end: from };
  const toks = core.split(/\s+/);
  let idx = src.indexOf(toks[0], from);
  while (idx >= 0) {
    let cur = idx + toks[0].length;
    let ok = true;
    for (let t = 1; t < toks.length; t++) {
      let j = cur;
      while (j < src.length && isWs(src[j])) j++;
      if (src.startsWith(toks[t], j)) cur = j + toks[t].length;
      else { ok = false; break; }
    }
    if (ok) {
      const before = idx > 0 ? src[idx - 1] : null;
      const after = cur < src.length ? src[cur] : null;
      const leadOk = !lead || before === null || isWs(before) || before === '>';
      const trailOk = !trail || after === null || isWs(after) || after === '<';
      if (leadOk && trailOk) return { start: idx, end: cur };
    }
    idx = src.indexOf(toks[0], idx + 1);
  }
  return null;
}

/** Align one placeholder unit at/after `pos`. Returns {ok:true,...} or {ok:false,fail}. */
function alignUnit(src, parts, pos) {
  const groups = [];
  let start, cur, i;
  if (parts[0] !== '') {
    const m = indexOfWs(src, parts[0], pos);
    if (!m) return { ok: false, fail: 0 };
    start = m.start;
    cur = m.end;
    i = 1;
  } else {
    if (parts.length < 2) return { ok: false, fail: 0 };
    const m = indexOfWs(src, parts[1], pos);
    if (!m) return { ok: false, fail: 1 };
    // A unit cannot start mid-text: step back to the tag opening the leading placeholder.
    start = src.lastIndexOf('<', m.start);
    if (start < pos) start = m.start;
    groups.push(src.slice(start, m.start));
    cur = m.end;
    i = 2;
  }
  for (; i < parts.length; i++) {
    if (parts[i] === '') { groups.push(''); continue; }
    const m = indexOfWs(src, parts[i], cur);
    if (!m) return { ok: false, fail: i };
    if (m.start - cur > MAX_GAP) return { ok: false, fail: i, gap: m.start - cur };
    groups.push(src.slice(cur, m.start));
    cur = m.end;
  }
  return { ok: true, start, end: cur, groups };
}

function applyPlaceholderUnit(src, it) {
  const parts = it.en.split(/\u27E6\d+\u27E7/).map(escHtml);
  const zhParts = it.zh.split(/\u27E6\d+\u27E7/).map(escHtml);
  const out = [];
  let pos = 0, last = 0, n = 0, lastFail = null;
  while (n < MAX_HITS) {
    const m = alignUnit(src, parts, pos);
    if (!m.ok) { lastFail = m; break; }
    let text = zhParts[0];
    for (let i = 0; i < m.groups.length; i++) text += m.groups[i] + (zhParts[i + 1] !== undefined ? zhParts[i + 1] : '');
    out.push(src.slice(last, m.start), text);
    last = m.end;
    pos = m.end;
    n++;
    if (pos >= src.length) break;
  }
  out.push(src.slice(last));
  return { html: out.join(''), n, lastFail, parts };
}

/** Replace a unit wherever it fills a whole text node or a whole attribute value. */
function applyPlainUnit(src, it) {
  const lit = escHtml(it.en);
  const zh = escHtml(it.zh);
  const out = [];
  let pos = 0, last = 0, n = 0;
  while (n < MAX_HITS) {
    const m = indexOfWs(src, lit, pos);
    if (!m) break;
    let a = m.start;
    while (a > 0 && isWs(src[a - 1])) a--;
    let b = m.end;
    while (b < src.length && isWs(src[b])) b++;
    const before = src[a - 1];
    const after = src[b];
    const wholeTextNode = before === '>' && after === '<';
    const wholeAttr = before === '"' && src[a - 2] === '=' && after === '"';
    if (wholeTextNode || wholeAttr) {
      out.push(src.slice(last, a), src.slice(a, m.start) + zh + src.slice(m.end, b));
      last = b;
      n++;
      pos = b;
    } else {
      pos = m.end;
    }
  }
  out.push(src.slice(last));
  return { html: out.join(''), n, lastFail: null, parts: null };
}

if (listMode) {
  console.log('page:', page);
  console.log('file:', htmlPath);
  console.log('units still present in English in the built page:');
  let n = 0;
  for (const it of allItems) {
    const r = it.ph ? applyPlaceholderUnit(html, it) : applyPlainUnit(html, it);
    if (r.n) { n++; console.log(' ', it.k, 'x' + r.n, it.ph ? '[ph]' : '[text]', '::', it.en.replace(/\s+/g, ' ').slice(0, 110)); }
  }
  console.log('total:', n, 'of', allItems.length, 'page units');
  process.exit(0);
}

const applied = [], untouched = [];
const run = (it, fn) => {
  if (!it.zh || it.zh === it.en) { untouched.push({ k: it.k, why: 'no translation in TM', en: it.en.slice(0, 90) }); return; }
  const r = fn(html, it);
  if (r.n) {
    html = r.html;
    applied.push({ k: it.k, n: r.n, kind: it.ph ? 'placeholder' : 'text', en: it.en.replace(/\s+/g, ' ').slice(0, 70) });
  } else {
    let detail = '';
    if (r.lastFail && r.parts) {
      const f = r.lastFail.fail;
      detail = ' | align failed at literal #' + f + (r.lastFail.gap ? ' (gap ' + r.lastFail.gap + ')' : '') +
        ' | after "' + String(r.parts[Math.max(0, f - 1)]).slice(-30) + '" expected "' + String(r.parts[f]).slice(0, 30) + '"';
    }
    untouched.push({ k: it.k, why: 'no match' + detail, en: it.en.replace(/\s+/g, ' ').slice(0, 90) });
  }
};

// placeholder units first, only for keys exported as a block for this page
for (const it of patchable.filter((i) => i.ph && blockKeys.has(i.k)).sort((a, b) => b.en.length - a.en.length)) {
  run(it, applyPlaceholderUnit);
}
// then every whole-text-node / whole-attribute unit of the page
for (const it of patchable.filter((i) => !i.ph)) run(it, applyPlainUnit);

// ---- banner + footer ----
const beforeBanner = html;
html = html.replace(/<div class="cov-banner">[\s\S]*?<\/div>\s*/, '');
const bannerRemoved = html !== beforeBanner;
const beforeFooter = html;
html = html.replace(/(中文翻译进度 )\d+%/, '$1100%');
const footerFixed = html !== beforeFooter;

console.log('page:', page);
console.log('file:', htmlPath);
console.log('page units:', pageUnits.units.length, '| with a TM translation:', patchable.length, '| block keys for this page:', blockKeys.size);
console.log('applied:', applied.length, '| untouched:', untouched.length);
console.log('banner removed:', bannerRemoved, '| footer set to 100%:', footerFixed);
console.log('bytes:', original.length, '->', html.length);
console.log('--- applied ---');
for (const a of applied) console.log(' ', a.k, a.kind, 'x' + a.n, '::', a.en);
console.log('--- not applied (' + untouched.length + ') ---');
for (const u of untouched) console.log(' ', u.k, u.why, '::', u.en);
if (dryRun) { console.log('(dry run, nothing written)'); process.exit(0); }

const bak = path.join('cache', 'refsite', path.basename(htmlPath) + '.prepatch.html');
fs.mkdirSync(path.dirname(bak), { recursive: true });
fs.writeFileSync(bak, original);
fs.writeFileSync(htmlPath, html);
console.log('backup:', bak);
console.log('written:', htmlPath);
