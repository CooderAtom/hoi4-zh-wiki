import fs from 'node:fs';

const dir = 'data/pageblocks';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.pr0000.json')).sort();
let grand = 0;
for (const f of files) {
  const b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  grand += b.items.length;
  console.log('=== ' + f.replace('.pr0000.json', '') + ' (' + b.items.length + ') ===');
  for (const it of b.items) {
    const seq = [...it.en.matchAll(/\u27E6(\d+)\u27E7/g)].map(m => m[1]).join(',');
    console.log(it.k + ' [' + seq + '] :: ' + it.en.replace(/\n/g, ' '));
  }
}
console.log('\nTOTAL ITEMS: ' + grand + ' across ' + files.length + ' files');
