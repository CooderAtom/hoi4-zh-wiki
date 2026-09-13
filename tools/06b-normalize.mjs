// Step 6b: terminology normalization over the translation memory.
// Different translation passes occasionally pick different renderings for the same
// English term; this rewrites known variants to one canonical wording.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';
import { Store, TM_PATH } from './translate.mjs';

const store = new Store();
console.log('translation memory entries:', store.size);

const VARIANT_RULES = [
  [/指挥群/g, '集团军'],
  [/指挥组/g, '集团军'],
  // "national focus" is 国策 on this site, so these must all point the SAME way. They used to
  // contradict each other: [焦点树 -> 国策树] followed by [国策 -> 国家焦点] rewrote "国家焦点树" to
  // the nonsense "国家国策树" (measured: it reached site/Qinghai_Ma.html), and the second rule was
  // also pushing 254 entries back to 国家焦点 against the convention. Longest form first.
  [/国家国策树/g, '国策树'],
  [/国家焦点树/g, '国策树'],
  [/焦点树/g, '国策树'],
  [/国家焦点/g, '国策'],
  [/政治力量/g, '政治点数'],
  [/政治权力(?=斗争)/g, '政治权力'],
  [/战争支持(?!度)/g, '战争支持度'],
  [/世界紧张(?!度)/g, '世界紧张度'],
  [/军用工厂/g, '军用工厂'],
  [/海军船坞/g, '海军船坞'],
  [/组织度值/g, '组织度'],
  [/运输舰队/g, '运输船队'],
  [/间谍(?=[^活动])/g, '特工'],
  [/寸步不让/g, '绝不后退'],
  [/唯有浴血/g, '以血盟誓'],
  [/效忠试炼/g, '效忠审判'],
  [/门前惊雷/g, '雷霆临门'],
  [/当世和平/g, '我们时代的和平'],
  [/武装反抗暴政/g, '反抗暴政'],
  [/发展日志/g, '开发者日志'],
  [/游戏日志/g, '开发日志'],
];

let edits = 0;
for (const [k, en, zh] of store.entries()) {
  let out = zh;
  for (const [re, rep] of VARIANT_RULES) { re.lastIndex = 0; out = out.replace(re, rep); }
  if (out !== zh) { store.data[k] = { en, zh: out }; store.dirty.add(k); edits++; }
}
const written = store.flush();
console.log(`normalization: ${edits} entries rewritten (written=${written})`);

// sanity: how many memory entries are still identical to their source
const same = store.entries().filter(([, en, zh]) => en && en === zh).length;
console.log('entries identical to source (identifiers/asset names):', same);
