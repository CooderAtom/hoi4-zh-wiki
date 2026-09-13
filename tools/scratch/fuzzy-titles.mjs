import fs from 'node:fs';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const titles = rows.map(r => r.title);
const byTitle = new Map(rows.map(r => [r.title, r]));

const wanted = ['Hearts of Iron IV Wiki', 'Getting started', 'Game rules', 'Custom Game Rules',
  'Politics', 'Political power', 'Laws', 'Stability', 'War support', 'Industry', 'Resources', 'Economy',
  'Subject', 'Autonomy', 'Lend-Lease', 'Government in exile', 'Combat', 'Naval invasion',
  'Attrition', 'Supply', 'Encirclement', 'Army', 'Air force', 'Division template', 'Tank',
  'Special forces', 'Theatre', 'Technology', 'Support technology', 'Doctrine'];

console.log('=== 精确标题不存在者 -> 模糊查找真实页面 ===\n');
for (const w of wanted) {
  const key = w.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hits = titles.filter(t => {
    const k = t.toLowerCase().replace(/[^a-z0-9]/g, '');
    return k === key || k.includes(key) || key.includes(k);
  }).slice(0, 6);
  if (hits.length === 0) { console.log('  [无任何近似] ' + w); continue; }
  const detail = hits.map(h => {
    const r = byTitle.get(h);
    const pct = Math.round(r.pct * 100);
    const left = Math.round(r.proseChars - r.translatedChars);
    return h + '(' + pct + '%' + (pct >= 99.5 ? '' : ', 剩' + left) + ')';
  });
  console.log('  ' + w.padEnd(24) + ' -> ' + detail.join(' | '));
}
