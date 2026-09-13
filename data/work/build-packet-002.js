// Build batch-NNN.zh.json from the translation mapping, then verify.
const fs = require('fs');
const path = require('path');
const BASE = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data';
const map = JSON.parse(fs.readFileSync(path.join(BASE, 'work/packet-002.zh.json'), 'utf8'));

const batches = [10, 11, 12];
let fail = 0;

function phs(s) {
  return (s.match(/⟦\d+⟧/g) || []);
}

for (const n of batches) {
  const name = 'batch-' + String(n).padStart(3, '0');
  const src = JSON.parse(fs.readFileSync(path.join(BASE, 'batches', name + '.json'), 'utf8'));
  const zh = map[name];
  if (!zh) { console.log('MISSING MAPPING', name); fail++; continue; }
  if (zh.length !== src.units.length) {
    console.log('COUNT MISMATCH', name, 'src', src.units.length, 'map', zh.length);
    fail++;
    continue;
  }
  const items = src.units.map((u, i) => ({ k: u.k, zh: zh[i] }));
  const out = { batch: src.batch, items };
  fs.writeFileSync(path.join(BASE, 'batches', name + '.zh.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');
}

// ---- verification pass ----
for (const n of batches) {
  const name = 'batch-' + String(n).padStart(3, '0');
  const src = JSON.parse(fs.readFileSync(path.join(BASE, 'batches', name + '.json'), 'utf8'));
  const dst = JSON.parse(fs.readFileSync(path.join(BASE, 'batches', name + '.zh.json'), 'utf8'));
  const problems = [];
  if (dst.batch !== src.batch) problems.push('batch number mismatch');
  if (!Array.isArray(dst.items) || dst.items.length !== src.units.length)
    problems.push('item count ' + (dst.items ? dst.items.length : 'n/a') + ' != ' + src.units.length);
  const n2 = Math.min(dst.items.length, src.units.length);
  for (let i = 0; i < n2; i++) {
    if (dst.items[i].k !== src.units[i].k) problems.push('k mismatch at ' + i);
    const a = phs(src.units[i].en), b = phs(dst.items[i].zh);
    if (a.join(',') !== b.join(',')) problems.push('placeholder mismatch at ' + i + ' [' + a.join(' ') + '] vs [' + b.join(' ') + ']');
    if (/<[a-zA-Z\/][^>]*>/.test(dst.items[i].zh)) problems.push('html tag at ' + i);
    if (dst.items[i].zh === '' ) problems.push('empty zh at ' + i);
  }
  console.log(name + ' items=' + dst.items.length + ' kSeq=' + (problems.filter(p => p.startsWith('k mismatch')).length === 0 ? 'ok' : 'BAD') +
    ' placeholders=' + (problems.filter(p => p.startsWith('placeholder')).length === 0 ? 'ok' : 'BAD'));
  if (problems.length) { fail++; console.log('  PROBLEMS: ' + problems.slice(0, 20).join('; ')); }
}
console.log(fail === 0 ? 'ALL CHECKS PASSED' : 'FAILURES: ' + fail);

// ---- report source strings whose translation is pure ASCII (expected to be identifiers only) ----
for (const n of batches) {
  const name = 'batch-' + String(n).padStart(3, '0');
  const src = JSON.parse(fs.readFileSync(path.join(BASE, 'batches', name + '.json'), 'utf8'));
  const dst = JSON.parse(fs.readFileSync(path.join(BASE, 'batches', name + '.zh.json'), 'utf8'));
  src.units.forEach((u, i) => {
    const z = dst.items[i].zh;
    if (!/[\u4e00-\u9fff]/.test(z)) {
      console.log('ASCII-KEPT ' + name + ' idx=' + i + ' k=' + u.k + ' en=' + JSON.stringify(u.en) + ' zh=' + JSON.stringify(z) + (z === u.en ? '' : '  <<< CHANGED'));
    }
  });
}
