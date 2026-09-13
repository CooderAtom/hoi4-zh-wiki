const fs = require('fs');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const pairs = [['batch-058.json', 'batch-058.zh.json'], ['batch-059.json', 'batch-059.zh.json']];
const tokRe = /⟦\d+⟧/g;
let allOk = true;
for (const [src, dst] of pairs) {
  const s = JSON.parse(fs.readFileSync(dir + src, 'utf8'));
  const problems = [];
  let z;
  try { z = JSON.parse(fs.readFileSync(dir + dst, 'utf8')); }
  catch (e) { console.log(dst + ' JSON PARSE FAIL: ' + e.message); allOk = false; continue; }
  if (!Array.isArray(z.items)) problems.push('items not array');
  if (z.batch !== s.batch) problems.push('batch number mismatch: ' + z.batch + ' vs ' + s.batch);
  if (z.items.length !== s.units.length) problems.push('count mismatch: ' + z.items.length + ' vs ' + s.units.length);
  const n = Math.min(z.items.length, s.units.length);
  for (let i = 0; i < n; i++) {
    const a = s.units[i], b = z.items[i];
    if (a.k !== b.k) { problems.push('k mismatch at ' + i + ': ' + a.k + ' vs ' + b.k); continue; }
    if (typeof b.zh !== 'string' || b.zh.length === 0) problems.push('empty zh at ' + i + ' (' + a.k + ')');
    const ta = (a.en.match(tokRe) || []).join(',');
    const tb = (b.zh.match(tokRe) || []).join(',');
    if (ta !== tb) problems.push('token mismatch at ' + i + ' (' + a.k + '): [' + ta + '] vs [' + tb + ']');
    if (/<[a-zA-Z\/][^>]*>/.test(b.zh)) problems.push('html tag at ' + i + ' (' + a.k + ')');
  }
  // extra keys check
  const extra = Object.keys(z).filter(k => k !== 'batch' && k !== 'items');
  if (extra.length) problems.push('extra top-level keys: ' + extra.join(','));
  if (problems.length) { allOk = false; console.log(dst + ' FAIL:'); problems.slice(0, 40).forEach(p => console.log('  - ' + p)); }
  else console.log(dst + ' PASS (items=' + z.items.length + ')');
}
console.log(allOk ? 'ALL OK' : 'PROBLEMS FOUND');
