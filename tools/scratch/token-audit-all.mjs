// Site-wide placeholder audit: for every extracted unit that has a translation, check that the
// placeholder SEQUENCE in the Chinese matches the English exactly. A dropped ⟦n⟧ is a dropped link,
// image or inline element in the rendered page.
//   node tools/scratch/token-audit-all.mjs [--show 25]
import fs from 'node:fs';
import { Store } from '../translate.mjs';
const show = Number((process.argv.indexOf('--show') >= 0 ? process.argv[process.argv.indexOf('--show') + 1] : 25));

const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const st = new Store();
const TOK = /⟦\s*(\d+)\s*⟧/g;
const seq = (s) => { const o = []; let m; TOK.lastIndex = 0; while ((m = TOK.exec(s))) o.push(Number(m[1])); return o.join(','); };

let checked = 0, bad = 0, dropped = 0;
const bads = [];
for (const u of units) {
  const zh = st.get(u.en);
  if (typeof zh !== 'string') continue;
  checked++;
  const a = seq(u.en), b = seq(zh);
  if (a === b) continue;
  bad++;
  const an = a ? a.split(',').length : 0, bn = b ? b.split(',').length : 0;
  if (bn < an) dropped++;
  bads.push({ u, zh, a, b, lost: an - bn });
}
bads.sort((x, y) => y.lost - x.lost);
console.log('translated units checked=' + checked + '  placeholder mismatches=' + bad + '  (of which placeholder-dropping=' + dropped + ')');
console.log('');
for (const x of bads.slice(0, show)) {
  console.log('  lost=' + x.lost + '  en[' + x.a + ']  zh[' + x.b + ']  ctx=' + x.u.ctx + '  key=' + x.u.k);
  console.log('     EN: ' + x.u.en.replace(/\s+/g, ' ').slice(0, 120));
  console.log('     ZH: ' + x.zh.replace(/\s+/g, ' ').slice(0, 120));
}
