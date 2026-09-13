import fs from 'node:fs';
const h = fs.readFileSync('site/Patches.html', 'utf8');
for (const t of ['重大补丁', '大型补丁', 'Graveyard', '帝国坟场', '诸神黄昏', 'Peace for Our Time', '我们时代的和平', '不妥协']) {
  const i = h.indexOf(t);
  console.log(t.padEnd(22) + ' idx=' + i + (i >= 0 ? '  ...' + h.slice(Math.max(0, i - 100), i + 120).replace(/\n/g, ' ') + '...' : ''));
}
