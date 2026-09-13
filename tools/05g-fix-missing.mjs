// Step 5g: fetch + store any image still missing on disk, using Windows-safe names.
//   rewrite: cache/pages/*.json image srcs are handled by sanitize on rebuild.
// usage: node tools/05g-fix-missing.mjs [--limit N]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, CACHE, SITE, readJson, writeJson, getBuf, pmap } from './lib.mjs';
import { safeImageName, localImagePath } from './sanitize.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const LIMIT = arg('--limit', 0);

const IMG_RE = /\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff?)$/i;
const IMG_DIR = path.join(SITE, 'images');
const meta = readJson(path.join(CACHE, 'media-meta.json'), {});
const refs = readJson(path.join(DATA, 'media-refs.json'), []);
const mediaPath = path.join(DATA, 'media.json');
const media = readJson(mediaPath, { files: {} });
const files = media.files || {};
const keyOf = (n) => n.replace(/_/g, ' ');

// every image any built page references, via the current sanitize naming
const needed = new Map(); // raw name -> {url, local}
for (const r of refs) {
  if (!IMG_RE.test(r.file)) continue;
  const m = meta[keyOf(r.file)] || meta[r.file];
  if (!m || m.missing || !/^image\//.test(m.mime || '')) continue;
  needed.set(r.file, { url: m.url, local: safeImageName(r.file), rec: m });
}

const todo = [];
let present = 0;
for (const [name, info] of needed) {
  const dest = path.join(SITE, info.local);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { present++; continue; }
  todo.push({ name, ...info, dest });
}
console.log(`images needed=${needed.size} present=${present} missing=${todo.length}`);
const list = LIMIT ? todo.slice(0, LIMIT) : todo;

let ok = 0, fail = 0, bytes = 0;
const t0 = Date.now();
await pmap(list, async (t) => {
  try {
    const buf = await getBuf(t.url, { retries: 3, timeoutMs: 60000 });
    fs.writeFileSync(t.dest, buf);
    files[t.name] = { url: t.url, local: t.local, width: t.rec.width, height: t.rec.height, mime: t.rec.mime, bytes: buf.length, refs: 0 };
    ok++; bytes += buf.length;
  } catch (e) {
    fail++;
    files[t.name] = { ...(files[t.name] || {}), url: t.url, error: String(e.message || e) };
  }
  const n = ok + fail;
  if (n % 100 === 0) process.stderr.write(`\r  ${n}/${list.length} ok=${ok} fail=${fail} ${(bytes / 1048576).toFixed(1)}MB`);
}, 8);
process.stderr.write('\n');
writeJson(mediaPath, { generated: new Date().toISOString(), files });
const onDisk = fs.readdirSync(IMG_DIR).length;
console.log(`downloaded ok=${ok} fail=${fail} ${(bytes / 1048576).toFixed(1)}MB | images on disk=${onDisk}`);
if (fail) console.log('failures:', [...new Set(list.map((t) => t.name))].length ? Object.entries(files).filter(([, f]) => f.error).slice(0, 5).map(([n, f]) => `${n}: ${f.error}`) : '');
