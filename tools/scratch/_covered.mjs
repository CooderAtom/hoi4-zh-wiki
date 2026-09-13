import fs from 'node:fs';
const dir = 'data/pageblocks';
const all = new Set();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) all.add(it.k);
}
for (const src of ['BULK.s0.json', 'BULK.s200.json']) {
  const items = JSON.parse(fs.readFileSync(dir + '/' + src, 'utf8')).items;
  const gaps = [];
  items.forEach((it, i) => { if (!all.has(it.k)) gaps.push((i + 1) + ':' + it.k); });
  console.log(src + ' total=' + items.length + ' covered=' + (items.length - gaps.length) + ' missing=' + gaps.length);
  if (gaps.length) console.log('  ' + gaps.slice(0, 60).join(' '));
}
