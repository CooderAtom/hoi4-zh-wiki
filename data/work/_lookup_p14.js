const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches';
const want = new Set();
for (const b of ['batch-062.json', 'batch-063.json']) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, b), 'utf8'));
  for (const u of j.units) want.add(u.k);
}
const found = new Map();
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.zh.json')) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
  for (const it of (j.items || [])) {
    if (want.has(it.k)) {
      if (!found.has(it.k)) found.set(it.k, []);
      found.get(it.k).push(f + ' :: ' + it.zh);
    }
  }
}
// also check titles.zh.json maybe
const out = [];
for (const k of want) {
  if (found.has(k)) out.push(k + '\t' + found.get(k).join(' | '));
}
console.log('keys with prior translations: ' + out.length + ' / ' + want.size);
console.log(out.join('\n'));
