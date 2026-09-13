// General "why doesn't this translation render" probe.
// usage: node tools/scratch/diag-page-apply.mjs <CachePageSlug> "<needle english>"
import fs from 'node:fs';
import path from 'node:path';
import { parse, serialize } from '../dom.mjs';
import { readJson } from '../lib.mjs';
import { parserOutput, sanitize, assignHeadingIds } from '../sanitize.mjs';
import { collectUnits, applyTranslations } from '../units.mjs';
import { Store } from '../translate.mjs';

const slug = process.argv[2];
const needle = process.argv[3] || '';

const media = readJson(path.join('data', 'media.json'), { files: {} });
const images = new Map(Object.entries(media.files || {}));
const knownSlugs = new Set(fs.readdirSync(path.join('cache', 'pages'))
  .filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '').toLowerCase()));

const rec = readJson(path.join('cache', 'pages', slug + '.json'));
const dom = parse(rec.html);
const body = parserOutput(dom);
sanitize(body, { images, pageTitle: rec.title, known: knownSlugs });
assignHeadingIds(body);

console.log('page=' + rec.title + '  sanitized contains needle: ' + serialize(body).includes(needle));

const units = collectUnits(body);
console.log('collectUnits now returns ' + units.length + ' units');
const hit = units.filter((u) => (u.src || '').includes(needle));
console.log('units whose src contains needle: ' + hit.length);
for (const h of hit) console.log('   ctx=' + h.ctx + ' len=' + h.src.length + ' :: ' + h.src.slice(0, 130));

const store = new Store();
console.log('store.get(needle-exact) = ' + JSON.stringify(store.get(needle)));
for (const h of hit) console.log('   store.get(unit.src) = ' + JSON.stringify((store.get(h.src) || '(MISS)').slice(0, 90)));

applyTranslations(body, store, {});
console.log('AFTER apply, still contains needle: ' + serialize(body).includes(needle));
