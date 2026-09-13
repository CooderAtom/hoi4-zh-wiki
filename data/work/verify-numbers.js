const fs = require('fs');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const pairs = [['batch-027.json', 'batch-027.zh.json'], ['batch-028.json', 'batch-028.zh.json']];
const numRe = /[-+]?\d+(?:\.\d+)?%?/g;
const codeRe = /(NDefines\.[A-Za-z_.]+|\/Hearts of Iron IV[A-Za-z0-9_\/.]*|\\Hearts of Iron IV[A-Za-z0-9_\\.]*|INFRA_[A-Z_]+|[A-Z]{2,}(?:_[A-Z]+)+)/g;
const norm = a => a.join('|');
let bad = 0;
for (const [s, o] of pairs) {
  const src = JSON.parse(fs.readFileSync(dir + s, 'utf8'));
  const out = JSON.parse(fs.readFileSync(dir + o, 'utf8'));
  src.units.forEach((u, i) => {
    const zh = out.items[i].zh;
    const a = u.en.match(numRe) || [], b = zh.match(numRe) || [];
    if (norm(a) !== norm(b)) { console.log('NUM DIFF k=' + u.k + '\n  src=' + a.join(',') + '\n  out=' + b.join(',')); bad++; }
    const ca = u.en.match(codeRe) || [], cb = zh.match(codeRe) || [];
    const miss = ca.filter(x => !zh.includes(x));
    if (miss.length) { console.log('CODE MISSING k=' + u.k + ': ' + miss.join(', ')); bad++; }
  });
}
console.log(bad === 0 ? 'NUMBERS/IDENTIFIERS: OK' : 'NUMBERS/IDENTIFIERS: ' + bad + ' issue(s)');
// report strings with high ASCII-letter ratio (possible untranslated leftovers)
console.log('\n-- ASCII-heavy outputs (ratio of latin letters > 0.5) --');
for (const [s, o] of pairs) {
  const src = JSON.parse(fs.readFileSync(dir + s, 'utf8'));
  const out = JSON.parse(fs.readFileSync(dir + o, 'utf8'));
  src.units.forEach((u, i) => {
    const zh = out.items[i].zh;
    const latin = (zh.match(/[A-Za-z]/g) || []).length;
    if (latin / zh.length > 0.5) console.log(o + ' k=' + u.k + ' latinRatio=' + (latin / zh.length).toFixed(2) + ' :: ' + zh.slice(0, 110));
  });
}
