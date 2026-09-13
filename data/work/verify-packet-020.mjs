// Verify packet-020 translation outputs: count, k sequence, placeholder token sequence.
// usage: node verify-packet-020.mjs
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const FILES = ['batch-074.json', 'batch-075.json'];
const tokens = (s) => [...s.matchAll(/⟦\s*(\d+)\s*⟧/g)].map((m) => m[1]).join(',');
let fail = 0;

for (const f of FILES) {
  const src = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const outName = f.replace(/\.json$/, '.zh.json');
  const p = path.join(DIR, outName);
  if (!fs.existsSync(p)) { console.log(`${outName} MISSING`); fail++; continue; }
  const raw = fs.readFileSync(p, 'utf8');
  const out = JSON.parse(raw);
  const errs = [];
  if (raw.charCodeAt(0) === 0xfeff) errs.push('BOM present');
  if (out.batch !== src.batch) errs.push(`batch number ${out.batch} != ${src.batch}`);
  if (!Array.isArray(out.items)) errs.push('items not array');
  if (out.items.length !== src.units.length) errs.push(`count ${out.items.length} != ${src.units.length}`);
  if (Object.keys(out).length !== 2 || !('items' in out) || !('batch' in out)) errs.push('extra/missing top-level keys');
  const n = Math.min(out.items.length, src.units.length);
  for (let i = 0; i < n; i++) {
    const a = src.units[i], b = out.items[i];
    if (a.k !== b.k) errs.push(`k[${i}] ${a.k} != ${b.k}`);
    if (tokens(a.en) !== tokens(b.zh)) errs.push(`ph[${i}] ${a.k} src(${tokens(a.en)}) zh(${tokens(b.zh)})`);
    if (typeof b.zh !== 'string' || !b.zh.trim()) errs.push(`empty zh at ${a.k}`);
    if (Object.keys(b).length !== 2 || !('k' in b) || !('zh' in b)) errs.push(`item keys at ${a.k}`);
    if (/<[a-zA-Z/][^>]*>|\[\[|\{\{|\]\]|\}\}/.test(b.zh)) errs.push(`markup at ${a.k}`);
  }
  console.log(`${outName} items=${out.items.length} ${errs.length ? 'FAIL' : 'ok'}`);
  errs.slice(0, 20).forEach((e) => console.log('   - ' + e));
  if (errs.length) fail++;
}

// cross-file: same English source must map to the same Chinese inside this packet
const map = new Map();
const clash = [];
for (const f of FILES) {
  const src = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const out = JSON.parse(fs.readFileSync(path.join(DIR, f.replace(/\.json$/, '.zh.json')), 'utf8'));
  src.units.forEach((u, i) => {
    const prev = map.get(u.en);
    if (prev && prev.zh !== out.items[i].zh) clash.push(`${JSON.stringify(u.en)} -> "${prev.zh}" vs "${out.items[i].zh}"`);
    else map.set(u.en, { zh: out.items[i].zh, f });
  });
}
console.log(`cross-file consistency: ${clash.length ? 'FAIL' : 'ok'} (${map.size} distinct sources)`);
clash.slice(0, 10).forEach((c) => console.log('   - ' + c));
if (clash.length) fail++;
console.log(fail ? 'RESULT: FAIL' : 'RESULT: ALL CHECKS PASSED');
