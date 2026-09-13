// Independent verifier for packet 036 outputs (v2).
const fs = require('fs');
const BASE = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const PH = /⟦\d+⟧/g;
const seq = s => (s.match(PH) || []);
const tags = s => (s.match(/<[a-zA-Z\/][^>]*>/g) || []);
const nums = s => (s.match(/-?\d+(?:\.\d+)?%?/g) || []);
let fail = 0;
const seenEn = new Map();
const seenZh = new Map();
for (const n of [140, 141]) {
  const src = JSON.parse(fs.readFileSync(`${BASE}batch-${n}.json`, 'utf8'));
  const raw = fs.readFileSync(`${BASE}batch-${n}.zh.json`, 'utf8');
  const errs = [];
  if (raw.charCodeAt(0) === 0xFEFF) errs.push('BOM present');
  const out = JSON.parse(raw);
  if (out.batch !== n) errs.push('batch field = ' + out.batch);
  if (Object.keys(out).length !== 2) errs.push('extra top-level keys: ' + Object.keys(out));
  if (!Array.isArray(out.items) || out.items.length !== src.units.length) errs.push(`count ${out.items && out.items.length} != ${src.units.length}`);
  const N = Math.min(out.items.length, src.units.length);
  for (let i = 0; i < N; i++) {
    const s = src.units[i], o = out.items[i];
    if (Object.keys(o).length !== 2 || !('k' in o) || !('zh' in o)) errs.push(`idx ${i}: bad item shape`);
    if (o.k !== s.k) errs.push(`idx ${i}: k ${o.k} != ${s.k}`);
    if (seq(s.en).join('|') !== seq(o.zh).join('|')) errs.push(`idx ${i} k=${s.k}: ph [${seq(s.en)}] vs [${seq(o.zh)}]`);
    if (typeof o.zh !== 'string' || !o.zh.trim()) errs.push(`idx ${i} k=${s.k}: empty zh`);
    if (o.zh !== o.zh.trim()) errs.push(`idx ${i} k=${s.k}: leading/trailing whitespace`);
    if (/\[\[|\{\{/.test(o.zh)) errs.push(`idx ${i} k=${s.k}: wiki link/template markup`);
    if (/\uFFFD/.test(o.zh)) errs.push(`idx ${i} k=${s.k}: replacement char`);
    // every <tag> in output must exist in source (no NEW markup)
    const st = tags(s.en), ot = tags(o.zh);
    for (const t of ot) if (!st.includes(t)) errs.push(`idx ${i} k=${s.k}: NEW tag/markup ${t}`);
    if (ot.length > st.length) errs.push(`idx ${i} k=${s.k}: more tags than source (${st.length} -> ${ot.length})`);
    // numeric tokens present in source must survive
    for (const num of nums(s.en)) if (!o.zh.includes(num)) errs.push(`idx ${i} k=${s.k}: number ${num} lost`);
    const prev = seenEn.get(s.en);
    if (prev !== undefined && prev !== o.zh) errs.push(`idx ${i} k=${s.k}: inconsistent zh for identical en`);
    seenEn.set(s.en, o.zh);
    const prevEn = seenZh.get(o.zh);
    if (prevEn !== undefined && prevEn !== s.en) errs.push(`idx ${i} k=${s.k}: zh reused for different en`);
    seenZh.set(o.zh, s.en);
  }
  if (errs.length) { fail++; console.log(`batch-${n}: FAIL (${errs.length})`); errs.slice(0, 25).forEach(e => console.log('   ' + e)); }
  else console.log(`batch-${n}.zh.json items=${out.items.length} ok`);
}
const all = [140, 141].map(n => fs.readFileSync(`${BASE}batch-${n}.zh.json`, 'utf8')).join('\n');
const terms = ['政治点数','指挥点数','稳定度','战争支持度','世界紧张度','阵营','傀儡国','运输船队','人力','意识形态','主要国家','志愿军','特工','战争目标','禁运','附庸国','州','省份'];
const missing = terms.filter(t => !all.includes(t));
console.log('glossary spot-check missing:', missing.length ? missing.join(', ') : 'none');
console.log(fail === 0 ? 'ALL CHECKS PASSED' : `FAILURES: ${fail}`);
