// Step 2d: download media using the already-resolved metadata cache.
//   cache/media-meta.json (fully populated) + data/media-refs.json -> site/images/
// usage: node tools/05f-download.mjs [--limit N]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, CACHE, SITE, readJson, writeJson, getBuf, pmap } from './lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const LIMIT = arg('--limit', 0);

const IMG_RE = /\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff?)$/i;
const IMG_DIR = path.join(SITE, 'images');
fs.mkdirSync(IMG_DIR, { recursive: true });

const refs = readJson(path.join(DATA, 'media-refs.json'), []);
const meta = readJson(path.join(CACHE, 'media-meta.json'), {});
const mediaPath = path.join(DATA, 'media.json');
const media = readJson(mediaPath, { files: {} });
const files = media.files || {};

const images = refs.filter((r) => IMG_RE.test(r.file));
const todo = [];
let skippedMissing = 0, already = 0;
for (const r of images) {
  const name = r.file;
  const m = meta[name];
  const local = name.replace(/ /g, '_');
  const dest = path.join(IMG_DIR, local);
  if (!m || m.missing || !m.url) { files[name] = { missing: true, refs: r.refs }; skippedMissing++; continue; }
  if (!/^image\//.test(m.mime || '')) { files[name] = { ...m, refs: r.refs, skipped: 'not-an-image' }; continue; }
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { already++; continue; }
  todo.push({ name, m, refs: r.refs, dest, local });
}
console.log(`images=${images.length} | missing-meta=${skippedMissing} | already local=${already} | to download=${todo.length}`);
const list = LIMIT ? todo.slice(0, LIMIT) : todo;

let done = 0, fail = 0, bytes = 0;
const t0 = Date.now();
await pmap(list, async (t) => {
  try {
    const buf = await getBuf(t.m.url, { retries: 2, timeoutMs: 45000 });
    fs.writeFileSync(t.dest, buf);
    files[t.name] = { url: t.m.url, local: t.local, width: t.m.width, height: t.m.height, mime: t.m.mime, bytes: buf.length, refs: t.refs };
    done++; bytes += buf.length;
  } catch (e) {
    fail++;
    files[t.name] = { url: t.m.url, refs: t.refs, error: String(e.message || e) };
  }
  const n = done + fail;
  if (n % 200 === 0) {
    writeJson(mediaPath, { generated: new Date().toISOString(), files });
    const rate = n / ((Date.now() - t0) / 1000);
    process.stderr.write(`\r  ${n}/${list.length} ok=${done} fail=${fail} ${(bytes / 1048576).toFixed(1)}MB ${rate.toFixed(1)}/s`);
  }
}, 10);
process.stderr.write('\n');

writeJson(mediaPath, { generated: new Date().toISOString(), files });
console.log(`downloaded ok=${done} fail=${fail} (${(bytes / 1048576).toFixed(1)} MB) | files on disk=${fs.readdirSync(IMG_DIR).length}`);
console.log('record errors:', Object.values(files).filter((f) => f.error).length, '| missing:', Object.values(files).filter((f) => f.missing).length);
