import fs from 'node:fs';
import { Store, key, normalize } from '../translate.mjs';

const store = new Store();
console.log('store size: ' + store.size);
const samples = [
  'Tank designers are \u27E60\u27E7 that can be bought for \u27E61\u27E7 (usually 150). They provide \u27E62\u27E7 speed increases and stat bonuses to \u27E63\u27E7 and equipment. Only one tank designer can be selected at a time, but it can be removed for free or replaced at the price of the replacement. Besides political power, many tank designers have other prerequisites that must be completed before they are able to be selected and some are only available when certain \u27E64\u27E7 is enabled.',
  'Completing focus National Armor Focus will reduce the cost to \u27E60\u27E7 and upgrade this designer with an additional:',
  'Bhutan lacks resources, manpower, and industry at the start of 1936. To tackle this issue Bhutan needs manpower from China as a puppet. First its important to navigate the national focuses very carefully to maximize the bonuses it holds on the fascist side but still allying with Russia while being a communist. This will lead to a very quick defeat for China, and robbing Japan the opportunity to puppet China for itself.',
];
for (const s of samples) {
  const k = key(s);
  console.log('\nkey=' + k + ' get=' + JSON.stringify(store.get(s)));
  console.log('  raw[k]=' + JSON.stringify(store.raw ? store.raw[k] : 'n/a'));
}

// Which .zh.json blocks declare these page names?
const dir = 'data/pageblocks';
const names = new Set();
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.zh.json')) continue;
  const b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  if (b.page) names.add(b.page + '  <-  ' + f);
}
for (const n of [...names].filter(x => /tank|Bhutan|Don|Yunnan/i.test(x))) console.log('\n' + n);
