// Step 2b: resolve every referenced media file and download it into site/images/.
//   cache/media-meta.json = File: title -> imageinfo (resumable, expensive to re-query)
//   data/media.json       = { files: { "<File name>": { url, width, height, mime, local, bytes } } }
import fs from 'node:fs';
import path from 'node:path';
import { DATA, CACHE, SITE, readJson, writeJson, api, getBuf, pmap } from './lib.mjs';

const IMG_DIR = path.join(SITE, 'images');
fs.mkdirSync(IMG_DIR, { recursive: true });

const refs = readJson(path.join(DATA, 'media-refs.json'), []);
const prev = readJson(path.join(DATA, 'media.json'), { files: {} });
const files = { ...(prev.files || {}) };
console.log('media files referenced:', refs.length);

/* ---------- 1. observed display widths, from the cached HTML ---------- */
const widths = new Map();
const PAGES_DIR = path.join(CACHE, 'pages');
if (fs.existsSync(PAGES_DIR)) {
  for (const f of fs.readdirSync(PAGES_DIR)) {
    const rec = readJson(path.join(PAGES_DIR, f));
    if (!rec?.html) continue;
    const re = /<img\b[^>]*>/gi;
    let m;
    while ((m = re.exec(rec.html))) {
      const tag = m[0];
      const src = /src="([^"]+)"/i.exec(tag)?.[1] || '';
      const w = parseInt(/width="(\d+)"/i.exec(tag)?.[1] || '0', 10);
      const nm = decodeURIComponent((src.split('/').pop() || '')).replace(/^\d+px-/, '');
      if (!nm) continue;
      const t = /\/thumb\/[^/]+\/[^/]+\/[^/]+\/(\d+)px-/i.exec(src);
      const width = t ? Number(t[1]) : (w || 0);
      if (!width) continue;
      const cur = widths.get(nm);
      widths.set(nm, cur === undefined ? width : Math.max(cur, width));
    }
  }
}
console.log('files with observed display width:', widths.size);

/* ---------- 2. imageinfo metadata (cached on disk) ---------- */
const META_PATH = path.join(CACHE, 'media-meta.json');
const meta = readJson(META_PATH, {});
const missingMeta = refs.map((r) => r.file).filter((n) => !meta[n]);
console.log('metadata cached:', Object.keys(meta).length, '| to query:', missingMeta.length);
const CHUNK = 50;
for (let i = 0; i < missingMeta.length; i += CHUNK) {
  const batch = missingMeta.slice(i, i + CHUNK);
  let d = null;
  for (let attempt = 0; attempt < 3 && !d; attempt++) {
    try {
      d = await api({
        action: 'query', titles: batch.map((n) => 'File:' + n).join('|'),
        prop: 'imageinfo', iiprop: 'url|size|mime|sha1', format: 'json', formatversion: '2',
      });
    } catch (e) { await new Promise((r) => setTimeout(r, 1200)); }
  }
  if (!d) { console.error('\nmeta batch failed at', i); continue; }
  for (const p of d.query?.pages || []) {
    const nm = String(p.title || '').replace(/^File:/, '');
    const ii = p.imageinfo?.[0];
    meta[nm] = ii ? { url: ii.url, width: ii.width, height: ii.height, mime: ii.mime } : { missing: true };
  }
  for (const n of batch) if (!meta[n]) meta[n] = { missing: true };
  if (i % (CHUNK * 4) === 0) {
    writeJson(META_PATH, meta);
    process.stderr.write(`\r  meta ${Math.min(i + CHUNK, missingMeta.length)}/${missingMeta.length} (${Object.keys(meta).length} records)`);
  }
}
writeJson(META_PATH, meta);
process.stderr.write(`\r  meta done: ${Object.keys(meta).length} records\n`);

/* ---------- 3. decide what to fetch ---------- */
function thumbUrlFor(url, name, width) {
  const m = /^(.*\/images)\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/i.exec(url);
  if (!m) return null;
  const enc = encodeURIComponent(name.replace(/ /g, '_'));
  return `${m[1]}/thumb/${m[2]}/${m[3]}/${enc}/${width}px-${enc}`;
}
function pickTarget(name, mm) {
  const want = widths.get(name) || 0;
  const ow = mm.width || 0;
  if (!ow) return null;
  if (want && want < ow) return Math.max(want, 16);        // render a small thumb
  if (ow > 480) return 480;                                 // big photos: keep them light
  return null;                                              // icons: original file
}

const missing = [];
const todo = [];
for (const { file: name, refs: n } of refs) {
  const mm = meta[name];
  if (!mm || mm.missing) { missing.push(name); files[name] = { missing: true, refs: n }; continue; }
  if (!/^image\//.test(mm.mime || '')) { files[name] = { ...mm, refs: n, skipped: 'not-an-image' }; continue; }
  const target = pickTarget(name, mm);
  const local = name.replace(/ /g, '_');
  const done = files[name] && !files[name].missing && files[name].local &&
    fs.existsSync(path.join(IMG_DIR, local)) && files[name].target === target;
  if (!done) todo.push({ name, mm, n, target });
}
console.log('to download:', todo.length, '| missing on wiki:', missing.length, '| already local:', refs.length - todo.length - missing.length);
if (missing.length) console.log('  missing sample:', missing.slice(0, 10).join(', '));

/* ---------- 4. download ---------- */
let ok = 0, fail = 0, bytes = 0, processed = 0;
await pmap(todo, async ({ name, mm, n, target }) => {
  const local = name.replace(/ /g, '_');
  const dest = path.join(IMG_DIR, local);
  const url = target ? (thumbUrlFor(mm.url, name, target) || mm.url) : mm.url;
  const save = (buf, usedUrl, usedTarget) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    files[name] = { url: mm.url, local, width: mm.width, height: mm.height, mime: mm.mime, target: usedTarget, bytes: buf.length, refs: n };
    ok++; bytes += buf.length;
  };
  try {
    save(await getBuf(url), url, target);
  } catch (e) {
    try { save(await getBuf(mm.url), mm.url, null); }
    catch (e2) { fail++; files[name] = { ...mm, refs: n, error: String(e2.message || e2) }; }
  }
  if (++processed % 400 === 0) {
    writeJson(path.join(DATA, 'media.json'), { generated: new Date().toISOString(), files });
    process.stderr.write(`\r  downloaded ${processed}/${todo.length}`);
  }
}, 8);
process.stderr.write(`\r  downloaded ${processed}/${todo.length}\n`);

writeJson(path.join(DATA, 'media.json'), { generated: new Date().toISOString(), files });
const withLocal = Object.values(files).filter((f) => f && f.local).length;
console.log(`ok=${ok} fail=${fail} (${(bytes / 1048576).toFixed(1)} MB this run) | local files: ${withLocal} -> ${IMG_DIR}`);
