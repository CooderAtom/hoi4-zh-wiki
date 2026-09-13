import { Store } from '../translate.mjs';

const s = new Store();
s.load();

// Search the whole TM for entries whose Chinese contains 大型补丁 or Husky.
const all = s.data ?? s.map ?? s.entries ?? null;
console.log('store keys: ' + Object.keys(s).join(','));
let n = 0;
const dump = s.toJSON ? s.toJSON() : null;
if (dump) {
  for (const [en, zh] of Object.entries(dump)) {
    if (typeof zh === 'string' && (zh.includes('大型补丁') || zh.includes('Husky')))
      console.log('EN: ' + JSON.stringify(en) + '\nZH: ' + JSON.stringify(zh) + '\n');
    n++;
  }
  console.log('total entries: ' + n);
} else {
  console.log('no toJSON; probing raw');
}
