// Diagnose the Support_company apply gap: what does the extractor see NOW for the Assault Engineer
// paragraph, and does applyTranslations leave it English?
import fs from 'node:fs';
import path from 'node:path';
import { parse, serialize } from '../dom.mjs';
import { readJson } from '../lib.mjs';
import { parserOutput, sanitize, assignHeadingIds } from '../sanitize.mjs';
import { collectUnits, applyTranslations } from '../units.mjs';
import { Store } from '../translate.mjs';

const media = readJson(path.join('data', 'media.json'), { files: {} });
const images = new Map(Object.entries(media.files || {}));
const known = new Set(fs.readdirSync(path.join('cache', 'pages')).map((f) => f.replace(/\.json$/, '').toLowerCase()));

const rec = readJson(path.join('cache', 'pages', 'Support_company.json'));
const dom = parse(rec.html);
const body = parserOutput(dom);
sanitize(body, { images, pageTitle: rec.title, known });
assignHeadingIds(body);

const before = serialize(body);
console.log('sanitized source contains "introduced the Assault Engineer": ' + before.includes('introduced the Assault Engineer'));

const res = collectUnits(body);
const units = Array.isArray(res) ? res : (res.units || []);
console.log('collectUnits returned ' + units.length + ' units; first item keys: ' + Object.keys(units[0] || {}).join(','));
const hit = units.filter((u) => (u.en || u.src || '').includes('Assault Engineer Company'));
console.log('units mentioning "Assault Engineer Company": ' + hit.length);
for (const h of hit.slice(0, 4)) {
  const s = h.en || h.src || '';
  console.log('  k=' + (h.k || '?') + ' ctx=' + (h.ctx || '?') + ' len=' + s.length);
  console.log('     ' + s.slice(0, 170));
}

// now apply and see whether the English survives
const store = new Store();
const stats = {};
applyTranslations(body, store, stats);
const after = serialize(body);
console.log('');
console.log('AFTER apply: still contains "introduced the Assault Engineer": ' + after.includes('introduced the Assault Engineer'));
console.log('AFTER apply: still contains "Helicopter Brigade support company": ' + after.includes('Helicopter Brigade support company'));
console.log('stats: ' + JSON.stringify(stats));
