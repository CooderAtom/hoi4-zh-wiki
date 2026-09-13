const fs = require('fs');
const path = require('path');
const dir = process.argv[2] || 'C:\\Users\\Atom\\Documents\\GeneralWS\\hoi4-zh-wiki\\data\\batches';
const batches = ['batch-090.json', 'batch-091.json'];
let failures = 0;

const tok = s => (s.match(/⟦\d+⟧/g) || []);

for (const b of batches) {
  const src = JSON.parse(fs.readFileSync(path.join(dir, b), 'utf8'));
  const outName = b.replace(/\.json$/, '.zh.json');
  const outPath = path.join(dir, outName);
  const raw = fs.readFileSync(outPath);
  const problems = [];

  // BOM check
  if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) problems.push('BOM present');

  let out;
  try { out = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, '')); }
  catch (e) { console.log(`${outName} items=0 FAIL json parse: ${e.message}`); failures++; continue; }

  if (out.batch !== src.batch) problems.push(`batch number ${out.batch} != ${src.batch}`);
  if (!Array.isArray(out.items)) problems.push('items not array');
  if (out.items.length !== src.units.length) problems.push(`count ${out.items.length} != ${src.units.length}`);

  const n = Math.min(out.items.length, src.units.length);
  for (let i = 0; i < n; i++) {
    const s = src.units[i], o = out.items[i];
    if (o.k !== s.k) problems.push(`#${i} k mismatch ${o.k} != ${s.k}`);
    if (typeof o.zh !== 'string' || o.zh.trim() === '') problems.push(`#${i} (${s.k}) empty zh`);
    const ts = tok(s.en).join(','), to = tok(o.zh).join(',');
    if (ts !== to) problems.push(`#${i} (${s.k}) tokens [${ts}] != [${to}]`);
    if (/<[a-zA-Z/!][^>]*>/.test(o.zh)) problems.push(`#${i} (${s.k}) HTML tag in output`);
    if (/\[\[|\{\{|\]\]|\}\}/.test(o.zh)) problems.push(`#${i} (${s.k}) wiki markup in output`);
    if (/⟦\d+⟧/.test(o.zh) === false && /⟦/.test(o.zh)) problems.push(`#${i} (${s.k}) malformed placeholder`);
  }
  // duplicate k
  const seen = new Set();
  for (const o of out.items) { if (seen.has(o.k)) problems.push(`duplicate k ${o.k}`); seen.add(o.k); }

  if (problems.length) { failures++; console.log(`${outName} items=${out.items.length} FAIL`); problems.forEach(p => console.log('   - ' + p)); }
  else console.log(`${outName} items=${out.items.length} ok`);
}
console.log(failures ? `RESULT: ${failures} file(s) with problems` : 'RESULT: all checks passed');
