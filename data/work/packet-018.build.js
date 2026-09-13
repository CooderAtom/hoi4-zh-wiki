// packet-018 builder: batch-NNN.json + tr-NNN.txt -> batch-NNN.zh.json
// map line format:  <en>|||<zh>   ; a zh ending in '~' continues on the following
// line(s), each also ending in '~' except the last.  '//' starts a comment line.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;                       // .../hoi4-zh-wiki/data/work
const DATA = path.dirname(ROOT);              // .../hoi4-zh-wiki/data
const batches = path.join(DATA, 'batches');

function loadMap(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let pend = null;
  raw.forEach((line, i) => {
    if (!line.trim() || line.startsWith('//')) return;
    if (pend === null) {
      const at = line.indexOf('|||');
      if (at < 0) throw new Error(`${file}:${i + 1} missing |||`);
      const en = line.slice(0, at);
      const zh = line.slice(at + 3);
      if (en.endsWith('~')) pend = [en.slice(0, -1), zh];
      else out.push([en, zh]);
    } else {
      if (!line.endsWith('~')) throw new Error(`${file}:${i + 1} unterminated continuation`);
      out.push([pend[0], pend[1] + '\n' + line.slice(0, -1)]);
      pend = null;
    }
  });
  if (pend !== null) throw new Error(`${file}: unterminated block`);
  return out;
}

const phTokens = (s) => (s.match(/\u27e6[^\u27e7]*\u27e7/g) || []);

function build(n) {
  const tag = String(n).padStart(3, '0');
  const batch = JSON.parse(fs.readFileSync(path.join(batches, `batch-${tag}.json`), 'utf8'));
  const units = batch.units;
  const byK = new Map();
  for (const u of units) {
    if (byK.has(u.k)) throw new Error(`duplicate k ${u.k}`);
    byK.set(u.k, u.en);
  }
  const applied = new Map();
  for (const [en, zh] of loadMap(path.join(ROOT, `tr-${tag}.txt`))) {
    let hit = false;
    for (const u of units) {
      if (u.en === en) {
        hit = true;
        if (applied.has(u.k) && applied.get(u.k) !== zh) throw new Error(`conflict k=${u.k}`);
        applied.set(u.k, zh);
      }
    }
    if (!hit) console.log(`WARN unreferenced source line: ${JSON.stringify(en.slice(0, 70))}`);
  }
  const missing = units.filter((u) => !applied.has(u.k));
  if (missing.length) throw new Error(`missing ${missing.length} translations, first: ${missing[0].k} ${JSON.stringify(missing[0].en.slice(0, 60))}`);

  const items = units.map((u) => {
    const zh = applied.get(u.k);
    const a = phTokens(u.en).join(','), b = phTokens(zh).join(',');
    if (a !== b) throw new Error(`placeholder mismatch k=${u.k}\n  en: ${a}\n  zh: ${b}`);
    return { k: u.k, zh };
  });
  const out = { batch: n, items };
  const dest = path.join(batches, `batch-${tag}.zh.json`);
  fs.writeFileSync(dest, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(`${path.basename(dest)} items=${items.length} ok`);
}

build(Number(process.argv[2]));
