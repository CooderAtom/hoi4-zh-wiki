'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = 'C:\\Users\\Atom\\Documents\\GeneralWS\\hoi4-zh-wiki\\data\\batches';
const packet = JSON.parse(fs.readFileSync('C:\\Users\\Atom\\Documents\\GeneralWS\\hoi4-zh-wiki\\data\\work\\packet-025.json', 'utf8'));

const pairs = [];
for (const f of packet.files) {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const out = JSON.parse(fs.readFileSync(path.join(ROOT, f.replace(/\.json$/, '.zh.json')), 'utf8'));
  src.units.forEach((u, i) => {
    const o = out.items[i];
    if (!o || o.k !== u.k) throw new Error('alignment broken');
    pairs.push({ f, en: u.en, zh: o.zh });
  });
}

// 1) same EN string must never map to two different ZH strings (within this packet)
const byEn = new Map();
for (const p of pairs) {
  if (!byEn.has(p.en)) byEn.set(p.en, new Set());
  byEn.get(p.en).add(p.zh);
}
let dupIssue = 0;
for (const [en, set] of byEn) if (set.size > 1) { dupIssue++; console.log('DUP-EN  ' + JSON.stringify(en) + ' -> ' + [...set].join(' | ')); }
console.log('same-EN-different-ZH conflicts: ' + dupIssue);

// 2) numbers / percentages / identifiers must survive verbatim
const numTok = (s) => (s.match(/(?<![\w.])[-+]?\d+(?:[.,]\d+)?%?/g) || []).join('|');
let numIssue = 0;
for (const p of pairs) {
  const a = numTok(p.en), b = numTok(p.zh);
  if (a !== b) { numIssue++; console.log('NUM?  [' + p.f + '] en=' + JSON.stringify(p.en) + '  enNums=' + a + '  zhNums=' + b + '  zh=' + JSON.stringify(p.zh)); }
}
console.log('number-token differences (review): ' + numIssue);

// 3) canonical term spot checks: term must appear if its EN marker appears
const checks = [
  [/political power/i, '政治点数'], [/command power/i, '指挥点数'], [/war support/i, '战争支持度'],
  [/world tension/i, '世界紧张度'], [/national focus/i, '国家焦点'], [/focus tree/i, '国策树'],
  [/national spirit/i, '国家精神'], [/support company/i, '支援连'], [/air wing/i, '航空队'],
  [/puppet/i, '傀儡国'], [/civilian factory/i, '民用工厂'], [/military factory/i, '军用工厂'],
  [/dockyard/i, '船坞'], [/manpower/i, '人力'], [/equipment/i, '装备'], [/convoy/i, '运输船队'],
  [/lend-lease/i, '租借'], [/war goal/i, '战争目标'], [/stability/i, '稳定度'], [/officer corps/i, '军官团'],
];
let termIssue = 0;
for (const p of pairs) for (const [re, zh] of checks) if (re.test(p.en) && !p.zh.includes(zh)) { termIssue++; console.log('TERM? ' + JSON.stringify(p.en.slice(0, 90)) + '  expect ' + zh); }
console.log('canonical-term misses (review): ' + termIssue);

// 4) placeholders reused for a different EN fragment inside the packet
const phEn = new Map(); // token -> Set of surrounding EN words
for (const p of pairs) (p.en.match(/\u27E6\d+\u27E7/g) || []).forEach((t) => phEn.set(t, (phEn.get(t) || 0) + 1));
console.log('placeholder token usage counts: ' + JSON.stringify([...phEn.entries()]));

// 5) untranslated leftovers: zh identical to en for a multi-word prose string
let same = 0;
for (const p of pairs) if (p.zh === p.en && /[a-z]{3}\s+[a-z]{3}/i.test(p.en)) { same++; console.log('IDENTICAL  ' + JSON.stringify(p.en)); }
console.log('identical en/zh prose: ' + same);

// 6) fullwidth punctuation sanity
for (const p of pairs) {
  if (/[,;:!?]\s/.test(p.zh) && /[\u4e00-\u9fff]/.test(p.zh)) console.log('HALFWIDTH-PUNCT? ' + JSON.stringify(p.zh.slice(0, 80)));
}
console.log('total pairs: ' + pairs.length);
