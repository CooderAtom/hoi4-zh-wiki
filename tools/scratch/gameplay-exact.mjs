import fs from 'node:fs';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byTitle = new Map(rows.map(r => [r.title, r]));

// Real sidebar gameplay entries (7 groups), taken from the built sidebar itself.
const GROUPS = {
  '入门 (7)': ['Beginner\'s guide', 'User interface', 'Mechanics', 'Console commands', 'Hotkeys',
              'Countries', 'Tutorial videos'],
  '国家事务 (9)': ['Government', 'Ideas', 'Officer corps', 'National focus', 'Research',
                'Construction', 'Production', 'Events', 'Manpower'],
  '外交事务 (7)': ['Diplomacy', 'Puppet', 'Occupation', 'World tension', 'Intelligence agency',
                'Trade', 'Faction'],
  '战争 (12)': ['Warfare', 'Combat tactics', 'Logistics', 'Terrain', 'Weather', 'Battle plan',
              'Army planner', 'Command group', 'Division', 'Land battle', 'Naval battle',
              'Air warfare'],
  '军种 (7)': ['Land warfare', 'Naval warfare', 'Land units', 'Equipment', 'Ship designer',
             'Tank designer', 'Aircraft designer'],
  '科技与学说 (8)': ['Land doctrine', 'Naval doctrine', 'Air doctrine', 'Infantry technology',
                 'Armor technology', 'Naval technology', 'Air technology',
                 'Support companies technology'],
};

let done = 0, notDone = 0, absent = 0;
const pending = [];
console.log('=== 侧栏「主要玩法」50 页逐页核对 ===\n');
for (const [group, titles] of Object.entries(GROUPS)) {
  console.log('【' + group + '】');
  for (const t of titles) {
    const r = byTitle.get(t);
    if (!r) { absent++; console.log('   !! 数据中查无此页: ' + t); continue; }
    const pct = Math.round(r.pct * 100);
    const left = Math.round(r.proseChars - r.translatedChars);
    if (pct >= 99.5) { done++; console.log('   ' + String(pct).padStart(3) + '%  ' + t); }
    else {
      notDone++;
      pending.push([group, t, pct, left, r.proseChars]);
      console.log('   ' + String(pct).padStart(3) + '%  ' + t.padEnd(30) + ' 剩余 ' + left + ' / ' + r.proseChars);
    }
  }
  console.log('');
}
console.log('=== 汇总: 100% = ' + done + ' / 未译完 = ' + notDone + ' / 查无 = ' + absent + ' ===\n');
if (pending.length) {
  console.log('未译完的玩法页（按剩余字符排序）:');
  let sum = 0;
  for (const [g, t, p, l] of pending.sort((a, b) => b[3] - a[3])) {
    sum += l;
    console.log('   ' + String(p).padStart(3) + '%  剩余 ' + String(l).padStart(6) + '  [' + g.split(' ')[0] + '] ' + t);
  }
  console.log('\n   合计剩余: ' + sum.toLocaleString() + ' 字符');
}
