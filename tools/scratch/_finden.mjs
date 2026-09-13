import fs from 'node:fs';
const dir = 'data/pageblocks';
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u.en]));
// Print side-by-side EN/ZH for every landed item whose EN contains the given substring.
const needle = process.argv[2];
const found = new Map();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) {
    const en = byK.get(it.k);
    if (en && en.includes(needle) && !found.has(it.k)) found.set(it.k, { zh: it.zh, f, en });
  }
}
for (const [k, v] of found) console.log(k + ' [' + v.f + ']\n  EN: ' + v.en.slice(0, 110) + '\n  ZH: ' + v.zh.slice(0, 110));
console.log('matches=' + found.size);
