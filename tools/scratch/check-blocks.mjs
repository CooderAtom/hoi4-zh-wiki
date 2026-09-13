import fs from 'node:fs';
const dir = 'data/pageblocks';
const pr = fs.readdirSync(dir).filter(f => f.endsWith('.pr0000.json'));
const blocks = fs.readdirSync(dir).filter(f => /^CONT\.b(2[3-9]|3[0-3])\.zh\.json$/.test(f)).sort();

let bad = 0, totalZh = 0, totalExp = 0;
for (const blk of blocks) {
  const z = JSON.parse(fs.readFileSync(dir + '/' + blk, 'utf8'));
  const zk = new Map(z.items.map(i => [i.k, i.zh]));
  totalZh += z.items.length;
  const dups = z.items.length - zk.size;
  const extra = [];
  for (const k of zk.keys()) {
    let found = false;
    for (const f of pr) {
      const b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
      if (b.items.some(i => i.k === k)) { found = true; break; }
    }
    if (!found) extra.push(k);
  }
  console.log(blk + ': items=' + z.items.length + ' uniq=' + zk.size + ' dups=' + dups +
    (extra.length ? ' EXTRA=' + extra.join(',') : ''));
  if (dups || extra.length) bad++;
}
console.log('\nzh total: ' + totalZh);

// how many export items remain unimplemented across ALL pr files
const allExp = new Map();
for (const f of pr) {
  const b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  totalExp += b.items.length;
  for (const it of b.items) allExp.set(it.k + '\u0000' + f, it);
}
const written = new Set();
for (const blk of blocks) {
  for (const it of JSON.parse(fs.readFileSync(dir + '/' + blk, 'utf8')).items) written.add(it.k);
}
let miss = [];
for (const [key, it] of allExp) {
  const k = key.split('\u0000')[0];
  if (!written.has(k)) miss.push(k);
}
console.log('export items total: ' + totalExp + '  not-yet-written: ' + miss.length);
if (miss.length) console.log('  ' + miss.join(' '));
console.log(bad ? '\nBLOCK ISSUES: ' + bad : '\nblock key hygiene: OK');
