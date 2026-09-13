// Verify batch-0NN.zh.json against batch-0NN.json for a packet.
const fs = require('fs');
const path = require('path');
const DIR = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches';
const PACKET = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/work/packet-017.json';

const packet = JSON.parse(fs.readFileSync(PACKET, 'utf8'));
const ph = (s) => (s.match(/⟦\d+⟧/g) || []);
let allOk = true;

for (const file of packet.files) {
  const srcPath = path.join(DIR, file);
  const outPath = path.join(DIR, file.replace(/\.json$/, '.zh.json'));
  const errs = [];

  const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  const rawOut = fs.readFileSync(outPath);
  if (rawOut[0] === 0xEF && rawOut[1] === 0xBB && rawOut[2] === 0xBF) errs.push('output has UTF-8 BOM');
  const out = JSON.parse(rawOut.toString('utf8'));

  if (out.batch !== src.batch) errs.push(`batch field ${out.batch} != ${src.batch}`);
  if (!Array.isArray(out.items)) errs.push('items is not an array');
  if (out.items.length !== src.units.length) errs.push(`item count ${out.items.length} != ${src.units.length}`);

  const n = Math.min(out.items.length, src.units.length);
  for (let i = 0; i < n; i++) {
    const s = src.units[i], o = out.items[i];
    if (o.k !== s.k) errs.push(`k mismatch at index ${i}: "${o.k}" != "${s.k}"`);
    if (typeof o.zh !== 'string' || !o.zh.trim()) errs.push(`empty zh at index ${i} (k=${s.k})`);
    // "untranslated" only when the value has no CJK at all AND is not a pure
    // identifier / path / number / unit string (those must stay unchanged).
    const hasCJK = /[\u4e00-\u9fff]/.test(o.zh);
    const identifierLike = /^NDefines\./.test(s.en)
      || /\.png$/.test(s.en)
      || /^forum:\d+$/.test(s.en)
      || /^[A-Za-z_][A-Za-z0-9_.]*$/.test(s.en)
      || /^[-\d.,\s]+(km\/h|km|%)?$/.test(s.en)
      || s.en.length <= 6;
    if (o.zh === s.en && !identifierLike) errs.push(`untranslated (identical to en, not identifier-like) at index ${i} (k=${s.k}): "${s.en}"`);
    const a = ph(s.en), b = ph(o.zh);
    if (a.length !== b.length || a.some((t, j) => t !== b[j])) {
      errs.push(`placeholder mismatch at index ${i} (k=${s.k}): [${a}] vs [${b}]`);
    }
    if (/<[a-zA-Z\/][^>]*>/.test(o.zh)) errs.push(`possible HTML tag at index ${i} (k=${s.k})`);
    if (/\{\{|\}\}|\[\[|\]\]/.test(o.zh)) errs.push(`possible wiki markup at index ${i} (k=${s.k})`);
    if (/\{[^}]*\}/.test(o.zh) && !/[\\{}]/.test(s.en) && !/^NDefines/.test(s.en)) {
      errs.push(`unexpected brace at index ${i} (k=${s.k})`);
    }
  }

  // duplicate-k sanity: k sequence identical implies unique if source is unique
  const srcKeys = new Set(src.units.map(u => u.k));
  if (srcKeys.size !== src.units.length) errs.push('source has duplicate k values (unexpected)');

  if (errs.length) { allOk = false; console.log(`${file}: FAIL`); errs.forEach(e => console.log('   ' + e)); }
  else {
    const kept = out.items.filter(o => o.zh === (src.units.find(u => u.k === o.k) || {}).en);
    console.log(`${file} items=${out.items.length} ok  (verbatim identifier/number strings: ${kept.length})`);
  }
}
process.exit(allOk ? 0 : 1);
