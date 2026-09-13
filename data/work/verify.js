// Verify batch-NNN.zh.json against batch-NNN.json:
// (a) item count matches, (b) k sequence matches, (c) placeholder token sequences match per item.
const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches';
const targets = process.argv.slice(2);
let bad = 0;
for (const t of targets) {
  const srcName = t.replace('.zh.json', '.json');
  const src = JSON.parse(fs.readFileSync(path.join(dir, srcName), 'utf8'));
  const zh = JSON.parse(fs.readFileSync(path.join(dir, t), 'utf8'));
  const problems = [];
  if (zh.batch !== src.batch) problems.push('batch number ' + zh.batch + ' != ' + src.batch);
  if (!Array.isArray(zh.items)) problems.push('items not array');
  if (zh.items.length !== src.units.length) problems.push('count ' + zh.items.length + ' != ' + src.units.length);
  const n = Math.min(zh.items.length, src.units.length);
  const phRe = /⟦\s*(\d+)\s*⟧/g;
  for (let i = 0; i < n; i++) {
    const s = src.units[i], z = zh.items[i];
    if (s.k !== z.k) problems.push('k[' + i + '] ' + z.k + ' != ' + s.k);
    if (typeof z.zh !== 'string' || z.zh.length === 0) problems.push('empty zh at ' + s.k);
    const a = (s.en.match(phRe) || []).map(x => x.replace(/\s+/g, ''));
    const b = ((z.zh || '').match(phRe) || []).map(x => x.replace(/\s+/g, ''));
    if (a.join(',') !== b.join(',')) problems.push('placeholders at ' + s.k + ': [' + a.join(' ') + '] vs [' + b.join(' ') + ']');
    if (/<[a-zA-Z/][^>]*>/.test(z.zh || '')) problems.push('possible html tag at ' + s.k);
    if (/\{\{|\}\}|\[\[|\]\]/.test(z.zh || '')) problems.push('possible wiki markup at ' + s.k);
  }
  // uniqueness: same en must map to same zh within the packet
  const byEn = new Map();
  for (let i = 0; i < n; i++) {
    const e = src.units[i].en;
    if (byEn.has(e) && byEn.get(e) !== zh.items[i].zh) problems.push('inconsistent translation for same en: ' + JSON.stringify(e));
    byEn.set(e, zh.items[i].zh);
  }
  // BOM check
  const buf = fs.readFileSync(path.join(dir, t));
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) problems.push('file has BOM');
  if (problems.length) { bad++; console.log('FAIL ' + t); for (const p of problems) console.log('   - ' + p); }
  else console.log(t + ' items=' + zh.items.length + ' ok');
}
process.exit(bad ? 1 : 0);
