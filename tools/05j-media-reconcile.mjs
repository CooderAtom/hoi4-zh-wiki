// Final media reconciliation: make sure every image the sanitizer will reference
// exists on disk under exactly the name it derives, reusing the earlier downloads.
// usage: node tools/05j-media-reconcile.mjs [--limit N]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, CACHE, SITE, readJson, writeJson, getBuf, pmap } from './lib.mjs';
import { parse } from './dom.mjs';
import { parserOutput, sanitize, safeImageName } from './sanitize.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const LIMIT = arg('--limit', 0);

const IMG_DIR = path.join(SITE, 'images');
const mediaPath = path.join(DATA, 'media.json');
const media = readJson(mediaPath, { files: {} });
const files = media.files || {};
const meta = readJson(path.join(CACHE, 'media-meta.json'), {});

// 1. the exact set of raw image names the rebuild needs, found in the cached HTML
const PAGES = path.join(CACHE, 'pages');
const pageFiles = fs.readdirSync(PAGES).filter((f) => f.endsWith('.json'));
const known = new Set(pageFiles.map((f) => f.replace(/\.json$/, '').toLowerCase()));
const images = new Map(Object.entries(files));
const need = new Map(); // raw name -> local name
for (const f of pageFiles) {
  const rec = readJson(path.join(PAGES, f));
  if (!rec?.html) continue;
  try {
    const dom = parse(rec.html);
    const body = parserOutput(dom);
    sanitize(body, { images, pageTitle: rec.title, known });
    for (const img of dom.descendants()) {
      if (img.tag !== 'img') continue;
      const src = img.attr('src') || '';
      const m = /^images\/(.+)$/.exec(src);
      if (m) need.set(decodeURIComponent(m[1]), null);
    }
  } catch { /* ignore */ }
}
console.log('distinct local image files required:', need.size);

// 2. for each, figure out the raw wiki name (spaces) and whether the file exists
const keyOf = (n) => n.replace(/_/g, ' ');
const toFetch = [];
let present = 0, renamed = 0;
for (const local of need.keys()) {
  const dest = path.join(IMG_DIR, local);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { present++; continue; }
  // try to recover the raw name: the local name is safeImageName(raw)
  const candidates = [];
  // (a) reverse the escaping: _XX_ back to the character it encodes
  const unescaped = local.replace(/_([0-9a-f]{1,6})_/g, (m, hex) => String.fromCodePoint(parseInt(hex, 16)));
  candidates.push(unescaped, local, keyOf(unescaped), keyOf(local));
  let hit = null;
  for (const c of candidates) {
    for (const key of [c, c.replace(/_/g, ' ')]) {
      const rec = files[key] || meta[key] || meta[key.replace(/ /g, '_')];
      if (rec && (rec.local || rec.url)) { hit = { raw: key, rec }; break; }
    }
    if (hit) break;
  }
  // (b) an already-downloaded file under a different name? rename it
  if (hit?.rec?.local && hit.rec.local !== local && fs.existsSync(path.join(IMG_DIR, hit.rec.local))) {
    try { fs.copyFileSync(path.join(IMG_DIR, hit.rec.local), dest); renamed++; continue; } catch { /* ignore */ }
  }
  if (hit?.rec?.url) { toFetch.push({ raw: hit.raw, url: hit.rec.url, dest, local }); continue; }
  // (c) fall back to the metadata cache by fuzzy name
  const alt = meta[keyOf(unescaped)] || meta[unescaped] || meta[keyOf(local)];
  if (alt?.url) toFetch.push({ raw: unescaped, url: alt.url, dest, local });
  else if (alt?.missing) files[unescaped] = { missing: true };
}
console.log(`present=${present} recovered-by-copy=${renamed} to download=${toFetch.length}`);
const list = LIMIT ? toFetch.slice(0, LIMIT) : toFetch;

let ok = 0, fail = 0, bytes = 0;
await pmap(list, async (t) => {
  try {
    const buf = await getBuf(t.url, { retries: 3, timeoutMs: 60000 });
    fs.writeFileSync(t.dest, buf);
    files[t.raw] = { ...(files[t.raw] || {}), url: t.url, local: t.local, bytes: buf.length };
    ok++; bytes += buf.length;
  } catch (e) {
    fail++;
    files[t.raw] = { ...(files[t.raw] || {}), url: t.url, error: String(e.message || e) };
  }
  const n = ok + fail;
  if (n % 100 === 0) process.stderr.write(`\r  ${n}/${list.length} ok=${ok} fail=${fail}`);
}, 8);
process.stderr.write('\n');
writeJson(mediaPath, { generated: new Date().toISOString(), files });
console.log(`downloaded ok=${ok} fail=${fail} ${(bytes / 1048576).toFixed(1)}MB | files on disk=${fs.readdirSync(IMG_DIR).length}`);
