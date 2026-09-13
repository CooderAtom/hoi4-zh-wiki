import fs from 'node:fs';
const canon = JSON.parse(fs.readFileSync('tools/scratch/bulk/BULK.ALL.json', 'utf8')).items.slice(400, 1342);
const spanKeys = new Set(canon.map((c) => c.k));
const dir = 'data/pageblocks';
const mine = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  const items = b.items || [];
  if (items.length && items.every((i) => spanKeys.has(i.k))) mine.push(f);
}
fs.writeFileSync('tools/scratch/_myfiles.txt', mine.join('\n') + '\n', 'utf8');
console.log('spanOnlyBatches=' + mine.length);
