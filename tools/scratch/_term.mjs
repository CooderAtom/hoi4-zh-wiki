import fs from 'node:fs';
const dir = 'data/pageblocks';
const needles = process.argv.slice(2);
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) {
    if (needles.some((n) => (it.zh || '').includes(n))) console.log(f + ' | ' + it.k + ' | ' + it.zh.slice(0, 70));
  }
}
