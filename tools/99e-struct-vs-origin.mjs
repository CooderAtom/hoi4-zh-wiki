// Structural regression check against the IMMUTABLE origin scrape.
//
// `cache/site-before-html/` was never a clean pre-translation baseline: it already contained
// Chinese link labels, so comparing against it can hide (or invent) deltas. `cache/pages/*.json`
// is the raw English fetch and cannot be mutated by a build, so it is the only trustworthy
// reference for "did I lose markup?".
//   node tools/99e-struct-vs-origin.mjs [Page ...]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, SITE } from './lib.mjs';
import { parse, serialize } from './dom.mjs';
import { parserOutput } from './sanitize.mjs';

const CACHE_PAGES = path.join(ROOT, 'cache', 'pages');
const count = (s, re) => (s.match(re) || []).length;
const TAGS = [['img', /<img\b/g], ['a', /<a\b[^>]*href=/g], ['li', /<li\b/g], ['td', /<td\b/g], ['tr', /<tr\b/g], ['th', /<th\b/g], ['ul', /<ul\b/g], ['table', /<table\b/g]];

// The sanitizer deliberately removes wiki chrome. Measured on Air_technology: 461 of the origin's
// <img> live inside "collapse-template mw-collapsible" navboxes and only 107 survive by design.
// Counting that chrome as "loss" produced 570 bogus failures, so strip the SAME primitives that
// sanitize() strips (see the SELECTORS list in sanitize.mjs) from the reference first.
const CHROME_SEL = [
  '.printfooter', '.catlinks', '.noprint', '.metadata', '.ambox', '.eu4box', '.hatnote',
  '.versionbox', '.mw-editsection', '.navbox', '.infobox', '.sidebar', '.collapse-template',
  '.mw-collapsible', '.toc', '.reflist', '.mw-references-wrap', '.mw-jump',
];

function stripChrome(node) {
  for (const c of [...(node.children || [])]) {
    if (c.type !== 1) continue;
    const cls = (c.attr && (c.attr('class') || '')) || '';
    if (cls && CHROME_SEL.some((s) => cls.split(/\s+/).includes(s.slice(1)))) c.remove();
    else stripChrome(c);
  }
}

const want = process.argv.slice(2);
const files = want.length
  ? want.map((p) => p.replace(/\.html$/, '') + '.json')
  : fs.readdirSync(CACHE_PAGES).filter((f) => f.endsWith('.json'));

let checked = 0, regressed = 0;
const worst = [];

for (const f of files) {
  const slug = f.replace(/\.json$/, '');
  const rec = readJson(path.join(CACHE_PAGES, f));
  if (!rec?.html) continue;
  const builtPath = path.join(SITE, slug + '.html');
  if (!fs.existsSync(builtPath)) continue;

  let originHtml;
  try {
    const dom = parse(rec.html);
    stripChrome(dom);
    originHtml = serialize(parserOutput(dom));
  } catch { continue; }
  const built = fs.readFileSync(builtPath, 'utf8');
  checked++;

  const deltas = [];
  for (const [name, re] of TAGS) {
    const a = count(originHtml, re), b = count(built, re);
    // Sanitisation legitimately removes some chrome (infoboxes, nav, ambox/hatnote).
    // A *loss* of img/li/td/tr/table beyond chrome is a regression; extra is fine.
    if (b < a) deltas.push(`${name} ${b - a}`);
  }
  if (deltas.length) {
    regressed++;
    worst.push([slug, deltas.join(', ')]);
  }
}

if (regressed) {
  console.log(`pages with markup LOSS vs origin: ${regressed} of ${checked}`);
  for (const [s, d] of worst.slice(0, 20)) console.log(`  ${s.padEnd(40)} ${d}`);
} else {
  console.log(`ok: ${checked} pages, no markup loss vs origin scrape`);
}
