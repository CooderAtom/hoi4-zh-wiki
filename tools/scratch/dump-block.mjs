import fs from 'node:fs';

const dir = 'data/pageblocks';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.pr0000.json'));
const rows = [];
for (const f of files) {
  const b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  rows.push({ p: f.replace('.pr0000.json', ''), b });
}
rows.sort((a, b) => b.b.items.reduce((x, i) => x + i.en.length, 0) - a.b.items.reduce((x, i) => x + i.en.length, 0));

const start = Number(process.argv[2] || 0);
const count = Number(process.argv[3] || 7);
let items = 0, chars = 0;
for (const r of rows.slice(start, start + count)) {
  console.log('=== ' + r.p + ' (' + r.b.items.length + ') ===');
  for (const it of r.b.items) {
    const seq = [...it.en.matchAll(/\u27E6(\d+)\u27E7/g)].map(m => m[1]).join(',');
    console.log(it.k + ' [' + seq + '] :: ' + it.en.replace(/\n/g, ' '));
  }
  items += r.b.items.length;
  chars += r.b.items.reduce((a, i) => a + i.en.length, 0);
}
console.log('\nBLOCK: ' + items + ' items, ' + chars + ' chars');
