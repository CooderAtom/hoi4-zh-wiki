import fs from 'node:fs';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byTitle = new Map(rows.map(r => [r.title, r]));

// The gameplay navigation groups that make up "main gameplay".
const GROUPS = {
  '入门': ['Hearts of Iron IV Wiki', 'Getting started', 'Beginner\'s guide', 'Game rules',
           'Countries', 'Country creation', 'Custom Game Rules', 'Achievements'],
  '国家事务': ['Politics', 'Political power', 'National focus', 'National spirit', 'Ideology',
             'Government', 'Political parties and leaders', 'Laws', 'Manpower',
             'Stability', 'War support', 'Construction', 'Research', 'Industry',
             'Resources', 'Trade', 'Economy'],
  '外交事务': ['Diplomacy', 'Faction', 'Subject', 'Autonomy', 'Lend-Lease', 'Puppet',
             'World tension', 'Intelligence agency', 'Government in exile'],
  '战争': ['Warfare', 'Land warfare', 'Combat', 'Battle plan', 'Naval warfare', 'Naval invasion',
          'Air warfare', 'War goal', 'Peace conference', 'Attrition', 'Supply',
          'Logistics', 'Terrain', 'Weather', 'Encirclement', 'Occupation'],
  '军种': ['Army', 'Navy', 'Air force', 'Division', 'Division template', 'Unit',
          'Equipment', 'Ship', 'Aircraft', 'Tank', 'Military industrial organization',
          'Special forces', 'Experience', 'Commander', 'Theatre'],
  '科技与学说': ['Technology', 'Land doctrine', 'Naval doctrine', 'Air doctrine',
              'Industry technology', 'Engineering technology', 'Naval support technology',
              'Support technology', 'Doctrine'],
};

console.log('=== 侧栏玩法分组逐页核对 ===\n');
let total = 0, done = 0, partial = 0, missing = 0, absent = 0;
const notDone = [];

for (const [group, titles] of Object.entries(GROUPS)) {
  console.log('【' + group + '】');
  for (const t of titles) {
    total++;
    const r = byTitle.get(t);
    if (!r) { absent++; console.log('   ?? 不存在   ' + t); continue; }
    const pct = Math.round(r.pct * 100);
    const left = Math.round(r.proseChars - r.translatedChars);
    if (pct >= 99.5) { done++; console.log('   100%  ' + t.padEnd(34) + '(' + r.proseChars + ' 字符)'); }
    else {
      partial++;
      notDone.push([group, t, pct, left]);
      console.log('   ' + String(pct).padStart(3) + '%  ' + t.padEnd(34) + '剩余 ' + left + ' 字符');
    }
  }
  console.log('');
}

console.log('=== 汇总 ===');
console.log('已列出 ' + total + ' 个页面: 100% = ' + done + ', 未译完 = ' + partial + ', 标题不存在 = ' + absent);
console.log('\n未译完的玩法页:');
for (const [g, t, p, l] of notDone.sort((a, b) => b[3] - a[3])) {
  console.log('   ' + String(p).padStart(3) + '%  剩余 ' + String(l).padStart(6) + '  [' + g + '] ' + t);
}
