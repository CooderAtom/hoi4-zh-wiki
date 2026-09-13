// Step 2c: resilient incremental media fetch.
//   1. top up cache/media-meta.json for refs that still lack metadata (images only)
//   2. download every resolved file into site/images/, with a heartbeat
// usage: node tools/05e-media2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DATA, CACHE, SITE, readJson, writeJson, api, getBuf, pmap } from './lib.mjs';

const IMG_RE = /\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff?)$/i;
const IMG_DIR = path.join(SITE, 'images');
fs.mkdirSync(IMG_DIR, { recursive: true });

const refs = readJson(path.join(DATA, 'media-refs.json'), []);
const META_PATH = path.join(CACHE, 'media-meta.json');
const meta = readJson(META_PATH, {});
const mediaPath = path.join(DATA, 'media.json');
const media = readJson(mediaPath, { files: {} });
const files = media.files || {};

const images = refs.filter((r) => IMG_RE.test(r.file));
const nonImages = refs.length - images.length;
console.log(`refs=${refs.length} (images=${images.length}, non-image=${nonImages}) | meta=${Object.keys(meta).length}`);

// ---------- 1. metadata ----------
// The MediaWiki API normalises File: titles to spaces ("Flag of X.png") while the HTML
// references them with underscores ("Flag_of_X.png"); always store under both forms.
const keyOf = (n) => n.replace(/_/g, ' ');
const needMeta = images.map((r) => r.file).filter((n) => !meta[keyOf(n)]);
console.log('metadata to fetch for', needMeta.length, 'files');
const CHUNK = 50;
let chunks = 0;
for (let i = 0; i < needMeta.length; i += CHUNK) {
  const batch = needMeta.slice(i, i + CHUNK);
  let d = null;
  for (let attempt = 0; attempt < 3 && !d; attempt++) {
    try {
      d = await api({
        action: 'query', titles: batch.map((n) => 'File:' + keyOf(n)).join('|'),
        prop: 'imageinfo', iiprop: 'url|size|mime', format: 'json', formatversion: '2',
      });
    } catch (e) { await new Promise((r) => setTimeout(r, 800)); }
  }
  if (d) {
    for (const p of d.query?.pages || []) {
      const nm = String(p.title || '').replace(/^File:/, '');
      const ii = p.imageinfo?.[0];
      meta[nm] = ii ? { url: ii.url, width: ii.width, height: ii.height, mime: ii.mime } : { missing: true };
    }
  }
  for (const n of batch) { const k = keyOf(n); if (!meta[k]) meta[k] = { missing: true }; }
  chunks++;
  if (chunks % 10 === 0) {
    writeJson(META_PATH, meta);
    console.log(`  meta ${Math.min(i + CHUNK, needMeta.length)}/${needMeta.length} chunks=${chunks} records=${Object.keys(meta).length}`);
  }
}
writeJson(META_PATH, meta);
console.log('metadata complete:', Object.keys(meta).length, 'records');

// ---------- 2. downloads ----------
const todo = [];
for (const r of images) {
  const name = r.file;
  const m = meta[keyOf(name)] || meta[name];
  const local = name.replace(/ /g, '_');
  const dest = path.join(IMG_DIR, local);
  if (!m || m.missing) { files[name] = { missing: true, refs: r.refs }; continue; }
  if (!/^image\//.test(m.mime || '')) { files[name] = { ...m, refs: r.refs, skipped: 'not-an-image' }; continue; }
  if (fs.existsSync(dest) && files[name]?.url === m.url) continue;
  todo.push({ name, m, refs: r.refs, dest, local });
}
console.log('to download:', todo.length, '| already local:', images.length - todo.length);
let done = 0, fail = 0, bytes = 0;
await pmap(todo, async (t) => {
  try {
    const buf = await getBuf(t.m.url, { retries: 2, timeoutMs: 60000 });
    fs.mkdirSync(path.dirname(t.dest), { recursive: true });
    fs.writeFileSync(t.dest, buf);
    files[t.name] = { url: t.m.url, local: t.local, width: t.m.width, height: t.m.height, mime: t.m.mime, bytes: buf.length, refs: t.refs };
    done++; bytes += buf.length;
  } catch (e) {
    fail++;
    files[t.name] = { ...t.m, refs: t.refs, error: String(e.message || e) };
  }
  if (++done % 0 === 0) { /* noop */ }
  if ((done + fail) % 250 === 0) {
    writeJson(mediaPath, { generated: new Date().toISOString(), files });
    console.log(`  downloaded ${done + fail}/${todo.length} (ok=${done} fail=${fail}, ${(bytes / 1048576).toFixed(1)} MB)`);
  }
}, 10);

writeJson(mediaPath, { generated: new Date().toISOString(), files });
const localCount = fs.readdirSync(IMG_DIR).length;
console.log(`download pass done: ok=${done} fail=${fail} bytes=${(bytes / 1048576).toFixed(1)}MB | files on disk=${localCount}`);
console.log('missing on wiki:', Object.values(files).filter((f) => f.missing).length,
  '| errors:', Object.values(files).filter((f) => f.error).length);
