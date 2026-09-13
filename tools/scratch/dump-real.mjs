import fs from 'node:fs';

const dir = 'data/pageblocks';
// Mirror the exporter's exclusion: units already covered by any .zh.json block for the same page.
const covered = new Map(); // page -> Set(k)
for (const f of fs.readdirSync(dir)) {
  if (!/\.zh\.json$/.test(f)) continue;
  const b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  if (!b || !b.page) continue;
  if (!covered.has(b.page)) covered.set(b.page, new Set());
  for (const it of b.items) covered.get(b.page).add(it.k);
}

const rows = [];
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.pr0000.json')) continue;
  const b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  const page = b.page;
  let items = b.items;
  if (covered.has(page)) items = items.filter((i) => !covered.get(page).has(i.k));
  rows.push({ p: page, items, chars: items.reduce((a, i) => a + i.en.length, 0) });
}
rows.sort((a, b) => b.chars - a.chars);

const start = Number(process.argv[2] || 0);
const count = Number(process.argv[3] || rows.length);
let items = 0, chars = 0;
for (const r of rows.slice(start, start + count)) {
  if (!r.items.length) continue;
  console.log('=== ' + r.p.replace(/_/g, ' ') + ' (' + r.items.length + ') ===');
  for (const it of r.items) {
    const seq = [...it.en.matchAll(/\u27E6(\d+)\u27E7/g)].map((m) => m[1]).join(',');
    console.log(it.k + ' [' + seq + '] :: ' + it.en.replace(/\n/g, ' '));
  }
  items += r.items.length;
  chars += r.chars;
}
console.log('\nBLOCK: ' + items + ' items, ' + chars + ' chars');
console.log('TOTAL FILES: ' + rows.length + ', ALL ITEMS: ' + rows.reduce((a, r) => a + r.items.length, 0) + ', ALL CHARS: ' + rows.reduce((a, r) => a + r.chars, 0));
console.log('\nFILE ORDER:');
rows.forEach((r, i) => console.log('  ' + i + '  ' + String(r.chars).padStart(6) + '  ' + String(r.items.length).padStart(4) + '  ' + r.p));
