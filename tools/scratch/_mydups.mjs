import fs from 'node:fs';
const dir = 'data/pageblocks';
const byPage = new Map();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  const items = b.items || [];
  if (!byPage.has(b.page)) byPage.set(b.page, []);
  byPage.get(b.page).push({ f, keys: items.map((i) => i.k) });
}
const mine = new Set(fs.readFileSync('tools/scratch/_myfiles.txt', 'utf8').split(/\r?\n/).filter(Boolean));
let bad = 0;
for (const [p, list] of byPage) {
  if (list.length < 2) continue;
  const seen = new Map();
  for (const x of list) for (const k of x.keys) {
    if (seen.has(k) && (mine.has(x.f) || mine.has(seen.get(k)))) {
      console.log('DUP ' + k + ' in ' + seen.get(k) + ' + ' + x.f);
      bad++;
    } else seen.set(k, x.f);
  }
}
console.log('myCrossFileDups=' + bad);
