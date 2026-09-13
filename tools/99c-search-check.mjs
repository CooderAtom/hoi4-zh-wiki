// Verify the Chinese full-text search index actually covers translated gameplay terms.
import fs from 'node:fs';

const js = fs.readFileSync('site/assets/search-index.js', 'utf8');
const m = js.match(/window\.HOI4_INDEX\s*=\s*(\{[\s\S]*\});?\s*$/);
if (!m) { console.error('could not parse search index'); process.exit(1); }
const idx = JSON.parse(m[1]);
console.log('index pages:', idx.pages.length, '| entry keys:', Object.keys(idx.pages[0]).join(','));

const mod = idx.pages.find((p) => /Modifier/.test(p.h || ''));
console.log('Modifiers entry: title=' + (mod && mod.t) + ' bodyLen=' + (mod && mod.b.length));

const terms = ['政治点数', '稳定度', '战争支持度', '世界紧张度', '自治度', '顺从度', '抵抗', '损耗',
  '组织度', '突破', '鱼雷', '舰载机', '民用工厂', '军用工厂', '船坞', '人力', '装备', '后勤',
  '国家焦点', '国策树', '国家精神', '师编制', '支援连', '航空队', '傀儡国', '军官团'];
let weak = 0;
for (const t of terms) {
  const n = idx.pages.filter((p) => (p.b && p.b.includes(t)) || (p.t && p.t.includes(t))).length;
  if (n === 0) weak++;
  console.log('  ' + (n === 0 ? 'MISSING' : String(n).padStart(4)) + '  ' + t);
}
console.log(weak === 0 ? 'ALL glossary terms searchable' : weak + ' glossary terms NOT searchable');
