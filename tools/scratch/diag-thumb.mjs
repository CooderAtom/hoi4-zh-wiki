// Why does the thumbcaption div never get rebuilt by applyTranslations?
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../dom.mjs';
import { readJson } from '../lib.mjs';
import { parserOutput, sanitize, assignHeadingIds } from '../sanitize.mjs';
import { hasBlockContent, collectUnits } from '../units.mjs';

const media = readJson(path.join('data', 'media.json'), { files: {} });
const images = new Map(Object.entries(media.files || {}));
const knownSlugs = new Set(fs.readdirSync(path.join('cache', 'pages'))
  .filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '').toLowerCase()));
const rec = readJson(path.join('cache', 'pages', 'Qinghai_Ma.json'));
const dom = parse(rec.html);
const body = parserOutput(dom);
sanitize(body, { images, pageTitle: rec.title, known: knownSlugs });
assignHeadingIds(body);

const NEEDLE = 'Qinghai Ma national focus tree.';
let target = null;
for (const e of body.descendants()) {
  if (e.children.some((c) => c.type === 3 && c.data.includes(NEEDLE))) { target = e; break; }
}
if (!target) { console.log('target element NOT FOUND'); process.exit(0); }

const chain = [];
for (let e = target; e; e = e.parent) chain.unshift(e);
console.log('ancestor chain (outermost first):');
for (const e of chain) {
  if (e.type !== 1) { console.log('   [text]'); continue; }
  const kids = (e.children || []).map((c) => (c.type === 3 ? 'text' : c.name)).join(',');
  console.log('   <' + e.name + (e.attr('class') ? ' class="' + e.attr('class') + '"' : '') + '>'
    + '  hasBlockContent=' + hasBlockContent(e) + '  kids=[' + kids + ']');
}

const units = collectUnits(body);
const mine = units.filter((u) => u.src === NEEDLE);
console.log('');
console.log('collectUnits units with src === needle: ' + mine.length + '  ctx=' + mine.map((u) => u.ctx).join(','));
const withPh = units.filter((u) => u.src.includes(NEEDLE) && u.src !== NEEDLE);
console.log('collectUnits units CONTAINING needle but not equal: ' + withPh.length);
for (const u of withPh.slice(0, 3)) console.log('   ctx=' + u.ctx + ' :: ' + JSON.stringify(u.src.slice(0, 90)));
