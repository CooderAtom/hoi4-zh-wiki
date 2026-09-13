import fs from 'node:fs';
const raw = JSON.parse(fs.readFileSync('data/tm.json', 'utf8'));
let withEn = 0, withoutEn = 0;
const sample = [];
for (const [k, v] of Object.entries(raw)) {
  const en = (v && v.en) || '';
  if (en) withEn++; else { withoutEn++; if (sample.length < 10) sample.push(k); }
}
console.log('TM entries: ' + Object.keys(raw).length);
console.log('  with en field:    ' + withEn);
console.log('  without en field: ' + withoutEn);
console.log('  sample key-only: ' + sample.join(', '));
