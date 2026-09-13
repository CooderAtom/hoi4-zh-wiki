// Step 4: extract every translatable unit from every cached page.
//   data/units.json      = unique units needing translation (with fragments/context)
//   data/page-units.json = per-page unit keys + section outline
import fs from 'node:fs';
import path from 'node:path';
import { parse } from './dom.mjs';
import { DATA, CACHE, readJson, writeJson } from './lib.mjs';
import { parserOutput, sanitize, assignHeadingIds } from './sanitize.mjs';
import { collectUnits, uniqueUnits } from './units.mjs';
import { key, Store } from './translate.mjs';

const PAGES_DIR = path.join(CACHE, 'pages');
const media = readJson(path.join(DATA, 'media.json'), { files: {} });
const images = new Map(Object.entries(media.files || {}));

const files = fs.existsSync(PAGES_DIR) ? fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json')) : [];
console.log('extracting units from', files.length, 'cached pages...');

// Pages included in the mirror (lower-case slugs, so link matching ignores the
// first-letter case-insensitivity of MediaWiki). Links to anything else — country
// pages, focus trees, script/data pages — are demoted to plain text.
const knownSlugs = new Set(files.map((f) => f.replace(/\.json$/, '').toLowerCase()));

const all = new Map();
const pageUnits = {};
let instances = 0, uniqueChars = 0;
let pageFails = 0;

for (const f of files) {
  const rec = readJson(path.join(PAGES_DIR, f));
  if (!rec?.html) continue;
  try {
    const dom = parse(rec.html);
    const body = parserOutput(dom);
    sanitize(body, { images, pageTitle: rec.title, known: knownSlugs });
    const toc = assignHeadingIds(body);
    const units = uniqueUnits(collectUnits(body));
    for (const u of units) {
      instances++;
      if (!all.has(key(u.src))) {
        all.set(key(u.src), { k: key(u.src), en: u.src, ctx: u.ctx, frags: u.fragments.length, pages: 1, len: u.src.length });
        uniqueChars += u.src.length;
      } else all.get(key(u.src)).pages++;
    }
    pageUnits[rec.title] = {
      slug: f.replace(/\.json$/, ''),
      units: units.map((u) => key(u.src)),
      toc: toc.map((t) => ({ level: t.level, id: t.id, text: t.text })),
    };
  } catch (e) {
    pageFails++;
    console.error('EXTRACT FAIL', rec.title, e.message);
  }
}

const units = [...all.values()].sort((a, b) => b.pages - a.pages || a.en.localeCompare(b.en));
writeJson(path.join(DATA, 'units.json'), units);
writeJson(path.join(DATA, 'page-units.json'), pageUnits);

const store = new Store();
const todo = units.filter((u) => !store.has(u.en));
console.log('--------------------------------------------------');
console.log('pages            :', Object.keys(pageUnits).length, pageFails ? `(${pageFails} failed)` : '');
console.log('unit instances   :', instances.toLocaleString());
console.log('unique units     :', units.length.toLocaleString());
console.log('unique chars     :', uniqueChars.toLocaleString());
console.log('already in memory:', (units.length - todo.length).toLocaleString());
console.log('todo units       :', todo.length.toLocaleString(), '=', todo.reduce((s, u) => s + u.len, 0).toLocaleString(), 'chars');
const byCtx = {};
for (const u of todo) { const c = u.ctx.split(':')[0]; byCtx[c] = (byCtx[c] || 0) + 1; }
console.log('todo by kind     :', JSON.stringify(byCtx));
console.log('todo by length   : <=40:', todo.filter((u) => u.len <= 40).length,
  ' 41-120:', todo.filter((u) => u.len > 40 && u.len <= 120).length,
  ' 121-300:', todo.filter((u) => u.len > 120 && u.len <= 300).length,
  ' >300:', todo.filter((u) => u.len > 300).length);
const top = Object.entries(pageUnits).map(([t, p]) => [t, p.units.length]).sort((a, b) => b[1] - a[1]);
console.log('pages with most units:', top.slice(0, 8).map(([t, n]) => `${t}(${n})`).join(', '));
