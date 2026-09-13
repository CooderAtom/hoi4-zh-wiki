// Unit-level renderability audit. Answers, for every translatable unit on the site:
//
//   applied      the renderer rebuilds this block from its translation          -> reaches the reader
//   textnode     a text node the text-node pass can translate directly           -> reaches the reader
//   masked       a nested-block unit that HAS a stored translation, but the
//                renderer only rebuilds leaf blocks, so it is never applied     -> stored but invisible
//
// `masked` is the expensive one: it is finished translation work that no reader can see, caused by
// collectUnits registering nested blocks (one unit for a whole subtree, space-joined) while
// applyTranslations only rebuilds blocks without nested block-level markup.
//
// usage: node tools/08g-render-audit.mjs [--top N]
import fs from 'node:fs';
import path from 'node:path';
import { CACHE, DATA, readJson, writeJson } from './lib.mjs';
import { parse } from './dom.mjs';
import { sanitize, parserOutput } from './sanitize.mjs';
import { hasBlockContent, translatable } from './units.mjs';
import { Store, normalize } from './translate.mjs';

const topN = Number((() => { const i = process.argv.indexOf('--top'); return i === -1 ? 15 : process.argv[i + 1]; })());

const store = new Store();
const media = readJson(path.join(DATA, 'media.json'), {});
const images = new Map(Object.entries(media.files || {}));
const known = new Set();

const BLOCKISH = ['p', 'li', 'td', 'th', 'div', 'section'];
const LEAFY = ['p', 'li', 'td', 'th', 'dt', 'dd', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'figcaption', 'caption', 'blockquote', 'summary'];

const files = fs.readdirSync(path.join(CACHE, 'pages')).filter((f) => f.endsWith('.json'));
const perPage = [];
let appliedChars = 0, appliedMissing = 0, nodeChars = 0, nodeMissing = 0, maskedChars = 0, maskedUnits = 0;

for (const f of files) {
  const rec = readJson(path.join(CACHE, 'pages', f));
  let dom; try { dom = parse(rec.html || rec.text); } catch { continue; }
  const body = parserOutput(dom);
  if (!body) continue;
  sanitize(body, { images, pageTitle: rec.title, known });

  let aCh = 0, aMiss = 0, nCh = 0, nMiss = 0, mCh = 0, mU = 0;

  const visit = (e) => {
    for (const c of [...e.children]) {
      if (c.type !== 1) continue;
      const leaf = (LEAFY.includes(c.name) && !hasBlockContent(c)) || (c.name === 'div' && !hasBlockContent(c));
      if (leaf && c.children.length) {
        const segs = [];
        const collect = (n) => { for (const y of n.children) { if (y.type === 3) segs.push(y.data); else if (y.type === 1) collect(y); } };
        collect(c);
        const src = normalize(segs.join(''));
        if (translatable(src)) {
          if (store.get(src) !== undefined) { aCh += src.length; appliedChars += src.length; }
          else { aMiss += src.length; appliedMissing += src.length; }
        }
        visit(c);
        continue;
      }
      const nested = BLOCKISH.includes(c.name) && hasBlockContent(c);
      if (nested && c.children.length) {
        const segs = [];
        const collect = (n) => { for (const y of n.children) { if (y.type === 3) { for (const b of y.data.split(/\s+/)) if (b) segs.push(b); } else if (y.type === 1) collect(y); } };
        collect(c);
        const src = normalize(segs.join(' '));
        if (translatable(src) && store.get(src) !== undefined) { mCh += src.length; mU++; maskedChars += src.length; maskedUnits++; }
        const walkText = (n) => {
          for (const y of n.children) {
            if (y.type === 3 && translatable(y.data)) {
              const w = Math.max(1, normalize(y.data).length);
              if (store.get(y.data) !== undefined) { nCh += w; nodeChars += w; } else { nMiss += w; nodeMissing += w; }
            } else if (y.type === 1) walkText(y);
          }
        };
        walkText(c);
        visit(c);
        continue;
      }
      visit(c);
    }
  };
  visit(body);

  const reach = aCh + aMiss + nCh + nMiss;
  if (reach > 0) perPage.push({ title: rec.title, file: f, reach, applied: aCh + nCh, masked: mCh, maskedUnits: mU, pct: (aCh + nCh) / reach });
}

perPage.sort((a, b) => b.masked - a.masked);
const reachTotal = perPage.reduce((s, p) => s + p.reach, 0);
const appliedTotal = perPage.reduce((s, p) => s + p.applied, 0);
console.log(`pages=${perPage.length}`);
console.log(`reachable unit chars : ${reachTotal.toLocaleString()}   translated & applied: ${appliedTotal.toLocaleString()}  (${(100 * appliedTotal / reachTotal).toFixed(1)}%)`);
console.log(`  leaf-block units   : ${appliedChars.toLocaleString()} ch translated, ${appliedMissing.toLocaleString()} ch still English`);
console.log(`  text-node units    : ${nodeChars.toLocaleString()} ch translated, ${nodeMissing.toLocaleString()} ch still English`);
console.log(`  MASKED nested units: ${maskedUnits.toLocaleString()} units / ${maskedChars.toLocaleString()} ch translated but never applied`);
console.log(`\npages holding the most masked (invisible) translation work:`);
for (const p of perPage.slice(0, topN)) console.log(`  ${String(p.masked).padStart(7)}c  ${String(p.maskedUnits).padStart(4)}u  ${p.pct.toFixed(2)} applied  ${p.title}`);
writeJson(path.join(DATA, 'render-audit.json'), perPage.map((p) => ({ title: p.title, reachableChars: p.reach, appliedChars: p.applied, maskedChars: p.masked, maskedUnits: p.maskedUnits, appliedPct: Number(p.pct.toFixed(4)) })));
