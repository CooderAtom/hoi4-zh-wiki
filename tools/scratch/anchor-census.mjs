// One-page anchor census: source (sanitized) vs built.
import fs from 'node:fs';
import path from 'node:path';
import { parse, serialize } from '../dom.mjs';
import { CACHE, readJson } from '../lib.mjs';
import { parserOutput, sanitize, assignHeadingIds } from '../sanitize.mjs';

const slug = process.argv[2] || 'List_of_political_advisors';
const needle = process.argv[3] || 'Ideology.html#Communism';
const media = readJson(path.join('data', 'media.json'), { files: {} });
const images = new Map(Object.entries(media.files || {}));
const files = fs.readdirSync(path.join(CACHE, 'pages')).filter((f) => f.endsWith('.json'));
const knownSlugs = new Set(files.map((f) => f.replace(/\.json$/, '').toLowerCase()));

const rec = readJson(path.join(CACHE, 'pages', slug + '.json'));
const dom = parse(rec.html);
const body = parserOutput(dom);
sanitize(body, { images, pageTitle: rec.title, known: knownSlugs });
assignHeadingIds(body);
const src = serialize(body);
const built = fs.readFileSync('site/' + slug + '.html', 'utf8');
const c = (s, n) => s.split(n).length - 1;
console.log('page=' + slug + '  needle=' + needle);
console.log('  sanitized source: ' + c(src, needle));
console.log('  built html      : ' + c(built, needle));
console.log('  source <a total : ' + (src.match(/<a\b/g) || []).length);
console.log('  built  <a total : ' + (built.match(/<a\b/g) || []).length);
// where do the source ones live?
const i = src.indexOf(needle);
if (i >= 0) console.log('\nsource context:\n' + src.slice(Math.max(0, i - 260), i + 120));
const j = built.indexOf(needle);
if (j >= 0) console.log('\nbuilt context:\n' + built.slice(Math.max(0, j - 260), j + 120));
else console.log('\nneedle NOT in built html at all');
