const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const packets = [['batch-056.json', 'batch-056.zh.json'], ['batch-057.json', 'batch-057.zh.json']];
let allOk = true;
for (const [sf, zf] of packets) {
  const raw = fs.readFileSync(dir + zf);
  const bom = raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF;
  const z = JSON.parse(raw.toString('utf8'));
  const s = JSON.parse(fs.readFileSync(dir + sf, 'utf8'));
  const errs = [];
  if (bom) errs.push('BOM present');
  if (z.batch !== s.batch) errs.push('batch number mismatch: ' + z.batch + ' vs ' + s.batch);
  if (!Array.isArray(z.items)) errs.push('items not array');
  if (z.items.length !== s.units.length) errs.push('count ' + z.items.length + ' vs ' + s.units.length);
  const n = Math.min(z.items.length, s.units.length);
  const tokRe = /⟦\d+⟧/g;
  for (let i = 0; i < n; i++) {
    const zu = z.items[i], su = s.units[i];
    if (zu.k !== su.k) errs.push('k mismatch at ' + i + ': ' + zu.k + ' vs ' + su.k);
    if (typeof zu.zh !== 'string' || !zu.zh.length) errs.push('empty zh at ' + i);
    const a = (su.en.match(tokRe) || []);
    const b = ((zu.zh || '').match(tokRe) || []);
    if (a.join(',') !== b.join(',')) errs.push('tokens at ' + i + ' (' + su.k + '): src[' + a.join(' ') + '] zh[' + b.join(' ') + ']');
    if (/<[a-zA-Z\/][^>]*>/.test(zu.zh || '')) errs.push('HTML-like tag at ' + i + ' (' + su.k + ')');
    if (!/[\u4e00-\u9fff]/.test(zu.zh || '') && /[a-zA-Z]{3}/.test(su.en)) errs.push('no Chinese at ' + i + ' (' + su.k + ')');
  }
  const zk = new Set(z.items.map(i => i.k));
  if (zk.size !== z.items.length) errs.push('duplicate k values');
  if (errs.length) { allOk = false; console.log('FAIL ' + zf); errs.forEach(e => console.log('   ' + e)); }
  else console.log(zf + ' items=' + z.items.length + ' ok');
}
process.exit(allOk ? 0 : 1);
