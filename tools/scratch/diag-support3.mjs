// Reproduce the real build path for one page by calling buildArticle() exactly as 07-build does.
import fs from 'node:fs';
import path from 'node:path';
import { readJson } from '../lib.mjs';
import { serialize } from '../dom.mjs';
import { Store } from '../translate.mjs';

const mod = await import('../page.mjs');
const { buildArticle } = mod;

const images = readJson(path.join('data', 'media.json'), { files: {} });
const imgMap = new Map(Object.entries(images.files || {}));
const knownPages = new Set(fs.readdirSync(path.join('cache', 'pages')).map((f) => f.replace(/\.json$/, '')));
const rec = readJson(path.join('cache', 'pages', 'Support_company.json'));
const store = new Store();

console.log('buildArticle arity: ' + buildArticle.length + '  exports: ' + Object.keys(mod).join(','));

const out = buildArticle(rec, store, imgMap, { knownPages });
const html = serialize(out.body);
console.log('cov=' + JSON.stringify(out.cov));
console.log('contains "introduced the Assault Engineer": ' + html.includes('introduced the Assault Engineer'));
console.log('contains 绐佸嚮宸ュ叺: ' + html.includes('绐佸嚮宸ュ叺'));

console.log('');
const kept = buildArticle(rec, new Store(), imgMap, { knownPages: null });
const html2 = serialize(kept.body);
console.log('knownPages=null -> contains "introduced the Assault Engineer": ' + html2.includes('introduced the Assault Engineer') + '  contains 绐佸嚮宸ュ叺: ' + html2.includes('绐佸嚮宸ュ叺'));
console.log('knownPages passed in was size ' + knownPages.size);

