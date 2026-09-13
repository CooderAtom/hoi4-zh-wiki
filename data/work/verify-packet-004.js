const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\Atom\\Documents\\GeneralWS\\hoi4-zh-wiki\\data\\batches';

function phs(s) {
  const out = [];
  const re = /⟦(\d+)⟧/g;
  let m;
  while ((m = re.exec(s)) !== null) out.push(m[1]);
  return out;
}
function nums(s) {
  return (s.match(/\d+(?:\.\d+)?/g) || []).join(',');
}

let fail = 0;
for (const n of ['015', '016']) {
  const srcPath = path.join(dir, `batch-${n}.json`);
  const outPath = path.join(dir, `batch-${n}.zh.json`);
  const raw = fs.readFileSync(outPath);
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) { console.log(`batch-${n}: BOM PRESENT`); fail++; }
  let src, out;
  try { src = JSON.parse(fs.readFileSync(srcPath, 'utf8')); } catch (e) { console.log(`batch-${n}: source parse error ${e.message}`); fail++; continue; }
  try { out = JSON.parse(raw.toString('utf8')); } catch (e) { console.log(`batch-${n}: OUTPUT PARSE ERROR ${e.message}`); fail++; continue; }

  const problems = [];
  if (out.batch !== Number(n)) problems.push(`batch number ${out.batch} != ${Number(n)}`);
  if (!Array.isArray(out.items)) problems.push('items not array');
  if (out.items.length !== src.units.length) problems.push(`count ${out.items.length} != ${src.units.length}`);

  const L = Math.min(out.items.length, src.units.length);
  for (let i = 0; i < L; i++) {
    const s = src.units[i], o = out.items[i];
    if (o.k !== s.k) problems.push(`#${i} k mismatch: ${o.k} != ${s.k}`);
    const a = phs(s.en).join(','), b = phs(o.zh).join(',');
    if (a !== b) problems.push(`#${i} (${s.k}) placeholders [${a}] != [${b}]`);
    if (typeof o.zh !== 'string' || o.zh.length === 0) problems.push(`#${i} (${s.k}) empty zh`);
    if (/<[a-zA-Z\/][^>]*>/.test(o.zh)) problems.push(`#${i} (${s.k}) HTML tag`);
    if (/\[\[|\{\{|\]\]|\}\}/.test(o.zh)) problems.push(`#${i} (${s.k}) wiki markup`);
    const sn = nums(s.en), on = nums(o.zh);
    if (sn !== on) problems.push(`#${i} (${s.k}) numbers [${sn}] != [${on}]`);
  }
  const extraKeys = Object.keys(out).filter(k => !['batch', 'items'].includes(k));
  if (extraKeys.length) problems.push(`extra top-level keys: ${extraKeys}`);

  if (problems.length) { fail++; console.log(`batch-${n}: FAIL`); problems.slice(0, 40).forEach(p => console.log('   ' + p)); if (problems.length > 40) console.log(`   ... ${problems.length - 40} more`); }
  else console.log(`batch-${n}: OK items=${out.items.length}`);
}
console.log(fail ? 'RESULT: FAILURES' : 'RESULT: ALL OK');
