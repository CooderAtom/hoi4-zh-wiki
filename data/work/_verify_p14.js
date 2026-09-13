const fs = require('fs');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const pairs = [['batch-062.json', 'batch-062.zh.json'], ['batch-063.json', 'batch-063.zh.json']];
const numRe = /[-+]?\d+(?:\.\d+)?%?/g;
const codeRe = /(NMilitary|STRATEGIC_[A-Z_]+|Strategic redeployment\.png)/g;
let bad = 0;
const shared = new Map(); // k -> [file:zh]
for (const [s, o] of pairs) {
  const src = JSON.parse(fs.readFileSync(dir + s, 'utf8'));
  const out = JSON.parse(fs.readFileSync(dir + o, 'utf8'));
  if (src.units.length !== out.items.length) { console.log('COUNT ' + o); bad++; }
  src.units.forEach((u, i) => {
    const zh = out.items[i].zh;
    if (u.k !== out.items[i].k) { console.log('K ' + o + ' idx' + i); bad++; }
    const a = (u.en.match(numRe) || []).join('|'), b = (zh.match(numRe) || []).join('|');
    if (a !== b) { console.log('NUM DIFF ' + o + ' k=' + u.k + '\n  src=' + a + '\n  out=' + b); bad++; }
    const miss = (u.en.match(codeRe) || []).filter(x => !zh.includes(x));
    if (miss.length) { console.log('CODE MISSING ' + o + ' k=' + u.k + ': ' + miss.join(',')); bad++; }
    if (/<[a-zA-Z\/][^>]*>/.test(zh) || /\{\{|\}\}|\[\[|\]\]/.test(zh)) { console.log('MARKUP ' + o + ' k=' + u.k); bad++; }
    if (shared.has(u.k) && shared.get(u.k)[0] !== zh) {
      console.log('CROSS-FILE MISMATCH k=' + u.k + '\n  ' + shared.get(u.k)[0] + ' [' + shared.get(u.k)[1] + ']\n  ' + zh + ' [' + o + ']');
      bad++;
    }
    shared.set(u.k, [zh, o]);
  });
  const buf = fs.readFileSync(dir + o);
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) { console.log('BOM ' + o); bad++; }
}
console.log('shared k count: ' + [...shared.keys()].length);
console.log(bad === 0 ? 'NUMBERS/IDENTIFIERS/CROSS-FILE: OK' : 'ISSUES: ' + bad);
console.log('\n-- latin-letter ratio > 0.35 (possible untranslated leftovers) --');
for (const [s, o] of pairs) {
  const src = JSON.parse(fs.readFileSync(dir + s, 'utf8'));
  const out = JSON.parse(fs.readFileSync(dir + o, 'utf8'));
  src.units.forEach((u, i) => {
    const zh = out.items[i].zh;
    const latin = (zh.match(/[A-Za-z]/g) || []).length;
    if (latin / zh.length > 0.35) console.log(o + ' k=' + u.k + ' ratio=' + (latin / zh.length).toFixed(2) + ' :: ' + zh.slice(0, 120));
  });
}
