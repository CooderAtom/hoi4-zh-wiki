// Compute exactly which local image files the current sanitizer expects on disk,
// and report the ones still missing (this drives the final media top-up).
import fs from 'node:fs';
import path from 'node:path';
import { DATA, CACHE, SITE, readJson, writeJson } from './lib.mjs';
import { parse } from './dom.mjs';
import { parserOutput, sanitize, localImagePath } from './sanitize.mjs';

const media = readJson(path.join(DATA, 'media.json'), { files: {} });
const images = new Map(Object.entries(media.files || {}));
const refs = readJson(path.join(DATA, 'media-refs.json'), []);
const needed = new Set();
const names = new Set(refs.map((r) => r.file));

// 1. what a rebuild will reference
const PAGES = path.join(CACHE, 'pages');
const files = fs.readdirSync(PAGES).filter((f) => f.endsWith('.json'));
const known = new Set(files.map((f) => f.replace(/\.json$/, '').toLowerCase()));
for (const f of files) {
  const rec = readJson(path.join(PAGES, f));
  if (!rec?.html) continue;
  try {
    const dom = parse(rec.html);
    const body = parserOutput(dom);
    sanitize(body, { images, pageTitle: rec.title, known });
    for (const img of dom.descendants ? dom.descendants() : []) {
      const src = img.attr && img.attr('src');
      if (src && img.tag === 'img') needed.add(src);
    }
  } catch { /* ignore */ }
}

const missing = [];
for (const src of needed) {
  const rel = decodeURIComponent(src).replace(/^\.\//, '');
  if (!fs.existsSync(path.join(SITE, rel))) missing.push(rel.replace(/^images\//, ''));
}
console.log(`pages scanned=${files.length} image srcs needed=${needed.size} missing on disk=${missing.length}`);
const withMeta = missing.filter((n) => { const m = media.files?.[n.replace(/_/g, ' ')] || media.files?.[n]; return m && m.url; });
const noMeta = missing.filter((n) => !withMeta.includes(n));
console.log(`missing but have a URL (retryable): ${withMeta.length}`);
console.log(`missing with no known URL: ${noMeta.length}`);
console.log('sample retryable:', withMeta.slice(0, 6).join(' | '));
console.log('sample no-url:', noMeta.slice(0, 6).join(' | '));
writeJson(path.join(DATA, 'images-missing.json'), missing);
