// Step 5d: group pending batches into agent work packets.
//   data/work/packet-NNN.json = { "files": ["batch-008.json", ...], "chars": N, "pages": [...] }
// usage: node tools/05d-packets.mjs [--target-chars 30000] [--max-files 6]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';
import { Store } from './translate.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const TARGET = arg('--target-chars', 30000);
const MAXF = arg('--max-files', 6);

const BATCH_DIR = path.join(DATA, 'batches');
const WORK_DIR = path.join(DATA, 'work');
fs.mkdirSync(WORK_DIR, { recursive: true });

const index = readJson(path.join(DATA, 'batch-index.json'), []);
const store = new Store();

// a batch counts as done when its .zh.json exists and covers all units
const done = new Set();
for (const b of index) {
  const zh = path.join(BATCH_DIR, b.file.replace(/\.json$/, '.zh.json'));
  if (!fs.existsSync(zh)) continue;
  const d = readJson(zh, null);
  if (d && Array.isArray(d.items) && d.items.length >= b.units) done.add(b.file);
}
console.log('batches total:', index.length, '| already translated:', done.size, '| remaining:', index.length - done.size);

const pending = index.filter((b) => !done.has(b.file));
// small batches first (fill packets efficiently), but keep page order roughly stable
const packets = [];
let cur = { files: [], chars: 0, pages: [], units: 0 };
const flush = () => { if (cur.files.length) packets.push(cur); cur = { files: [], chars: 0, pages: [], units: 0 }; };
for (const b of pending) {
  if (cur.files.length && (cur.chars + b.chars > TARGET || cur.files.length >= MAXF)) flush();
  cur.files.push(b.file);
  cur.chars += b.chars;
  cur.units += b.units;
  cur.pages.push(...b.pages);
}
flush();

for (const f of fs.readdirSync(WORK_DIR)) if (/^packet-\d+\.json$/.test(f)) fs.unlinkSync(path.join(WORK_DIR, f));
packets.forEach((p, i) => {
  writeJson(path.join(WORK_DIR, `packet-${String(i + 1).padStart(3, '0')}.json`), {
    packet: i + 1,
    files: p.files,
    chars: p.chars,
    units: p.units,
    pages: [...new Set(p.pages)].slice(0, 40),
  });
});
writeJson(path.join(DATA, 'packet-index.json'), packets.map((p, i) => ({
  packet: i + 1, file: `packet-${String(i + 1).padStart(3, '0')}.json`, files: p.files, chars: p.chars, units: p.units,
})));
console.log('packets:', packets.length, '| chars per packet avg:', Math.round(packets.reduce((s, p) => s + p.chars, 0) / (packets.length || 1)));
console.log('first 3:', JSON.stringify(packets.slice(0, 3).map((p) => ({ files: p.files, chars: p.chars, pages: p.pages.slice(0, 2) })), null, 1));
