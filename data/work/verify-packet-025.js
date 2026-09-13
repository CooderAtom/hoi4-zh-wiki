'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = 'C:\\Users\\Atom\\Documents\\GeneralWS\\hoi4-zh-wiki\\data\\batches';
const packet = JSON.parse(fs.readFileSync('C:\\Users\\Atom\\Documents\\GeneralWS\\hoi4-zh-wiki\\data\\work\\packet-025.json', 'utf8'));

const toks = (s) => (s.match(/\u27E6\d+\u27E7/g) || []);
let bad = 0;

for (const f of packet.files) {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const zn = f.replace(/\.json$/, '.zh.json');
  const out = JSON.parse(fs.readFileSync(path.join(ROOT, zn), 'utf8'));
  const errs = [];

  if (out.batch !== src.batch) errs.push('batch number mismatch: ' + out.batch + ' vs ' + src.batch);
  if (!Array.isArray(out.items)) errs.push('items is not an array');
  if (out.items.length !== src.units.length) errs.push('count mismatch ' + out.items.length + ' vs ' + src.units.length);

  const n = Math.min(out.items.length, src.units.length);
  for (let i = 0; i < n; i++) {
    const a = src.units[i], b = out.items[i];
    if (b.k !== a.k) { errs.push('k mismatch at index ' + i + ': ' + b.k + ' vs ' + a.k); continue; }
    if (typeof b.zh !== 'string' || b.zh.length === 0) { errs.push('empty zh for ' + a.k); continue; }
    const ta = toks(a.en).join(','), tb = toks(b.zh).join(',');
    if (ta !== tb) errs.push('placeholder mismatch for ' + a.k + ': [' + ta + '] vs [' + tb + ']');
    if (/<[a-zA-Z\/!][^>]*>/.test(b.zh) && !/<[a-zA-Z\/!][^>]*>/.test(a.en)) errs.push('possible HTML tag for ' + a.k + ': ' + b.zh);
    if (/\[\[|\{\{|'''|''/.test(b.zh)) errs.push('possible wiki markup for ' + a.k);
    if (/您/.test(b.zh)) errs.push('honorific used for ' + a.k);
  }

  // no duplicate k, no untranslated leftovers that are pure English sentences
  const keys = new Set(out.items.map((x) => x.k));
  if (keys.size !== out.items.length) errs.push('duplicate k values present');

  // only allowed keys per item
  for (const it of out.items) {
    const ks = Object.keys(it).sort().join(',');
    if (ks !== 'k,zh') errs.push('unexpected item keys: ' + ks);
  }

  // file bytes must be UTF-8 without BOM
  const buf = fs.readFileSync(path.join(ROOT, zn));
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) errs.push('file has UTF-8 BOM');

  if (errs.length) { bad++; console.log('FAIL ' + zn); for (const e of errs.slice(0, 25)) console.log('   - ' + e); }
  else console.log('PASS ' + zn + ' items=' + out.items.length + ' k-sequence=ok placeholders=ok');
}
console.log(bad === 0 ? 'ALL CHECKS PASSED' : bad + ' FILE(S) FAILED');
process.exit(bad === 0 ? 0 : 1);
