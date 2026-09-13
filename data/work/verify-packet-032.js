// Verifies packet-032 translations against their source batches.
const fs = require('fs');
const path = require('path');

const DATA = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data';
const packet = JSON.parse(fs.readFileSync(path.join(DATA, 'work', 'packet-032.json'), 'utf8'));

const phSeq = (s) => (s.match(/⟦\d+⟧/g) || []).join('|');
// numeric tokens: keep the digits+optional decimal+optional % only, so "pre-2021" yields "2021"
const numSeq = (s) => (s.match(/\d+(?:\.\d+)?%?/g) || []);
// a "pure identifier": one token, no spaces, letters/digits/underscore only
const isIdentifier = (s) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);
// prose = has a space and a run of >=3 lowercase latin letters
const isProse = (s) => /\s/.test(s) && /[a-z]{3}/.test(s);
const hasTag = (s) => /<\/?[A-Za-z][A-Za-z0-9]*[^>]*>/.test(s);

let failures = 0;
const notes = [];
for (const name of packet.files) {
  const src = JSON.parse(fs.readFileSync(path.join(DATA, 'batches', name), 'utf8'));
  const outName = name.replace(/\.json$/, '.zh.json');
  const outPath = path.join(DATA, 'batches', outName);
  const raw = fs.readFileSync(outPath);
  const problems = [];

  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) problems.push('file has UTF-8 BOM');
  let out;
  try { out = JSON.parse(raw.toString('utf8')); } catch (e) { problems.push('invalid JSON: ' + e.message); }
  if (out) {
    if (out.batch !== src.batch) problems.push(`batch mismatch ${out.batch} != ${src.batch}`);
    if (Object.keys(out).length !== 2 || !Array.isArray(out.items)) problems.push('unexpected top-level shape');
    if (out.items.length !== src.units.length) problems.push(`count ${out.items.length} != ${src.units.length}`);
    const n = Math.min(out.items.length, src.units.length);
    for (let i = 0; i < n; i++) {
      const s = src.units[i], o = out.items[i];
      if (s.k !== o.k) problems.push(`k[${i}] ${o.k} != ${s.k}`);
      if (phSeq(s.en) !== phSeq(o.zh)) problems.push(`placeholder[${i}] ${s.k}`);
      if (!o.zh || !o.zh.trim()) problems.push(`empty zh[${i}] ${s.k}`);
      if (isIdentifier(s.en) && s.en !== o.zh) problems.push(`identifier translated[${i}] ${s.k}: "${s.en}" -> "${o.zh}"`);
      if (isProse(s.en) && s.en === o.zh) problems.push(`untranslated prose[${i}] ${s.k}: "${s.en}"`);
      if (/⟦\d+⟧/.test(o.zh) && !/⟦\d+⟧/.test(s.en)) problems.push(`spurious placeholder[${i}] ${s.k}`);
      if (hasTag(o.zh) && !hasTag(s.en)) problems.push(`html tag[${i}] ${s.k}: ${o.zh}`);
      const missing = numSeq(s.en).filter((t) => !o.zh.includes(t));
      if (missing.length) problems.push(`numbers[${i}] ${s.k} missing ${missing.join(',')}`);
    }
  }

  if (problems.length) { failures++; console.log(`${outName} FAIL (${problems.length})`); problems.slice(0, 40).forEach((p) => console.log('   - ' + p)); }
  else console.log(`${outName} items=${src.units.length} ok`);
  if (notes.length < 20 && problems.length) notes.push(outName);
}
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `FAILURES: ${failures}`);
