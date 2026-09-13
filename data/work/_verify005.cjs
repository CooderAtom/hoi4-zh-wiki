const fs = require('fs');
const base = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const list = process.argv.slice(2);
let bad = 0;
for (const name of list) {
  const src = JSON.parse(fs.readFileSync(base + name + '.json', 'utf8'));
  const outPath = base + name + '.zh.json';
  const raw = fs.readFileSync(outPath);
  const bom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  const out = JSON.parse(raw.toString('utf8'));
  const s = src.units, o = out.items;
  const errs = [];
  if (bom) errs.push('BOM present');
  if (out.batch !== src.batch) errs.push(`batch field ${out.batch} != ${src.batch}`);
  if (o.length !== s.length) errs.push(`count ${o.length} != ${s.length}`);
  const ph = t => (String(t).match(/⟦\d+⟧/g) || []);
  const n = Math.min(s.length, o.length);
  for (let i = 0; i < n; i++) {
    if (s[i].k !== o[i].k) errs.push(`k#${i}: got ${o[i].k} expected ${s[i].k}`);
    const a = ph(s[i].en), b = ph(o[i].zh);
    if (a.join(',') !== b.join(',')) errs.push(`ph#${i} k=${s[i].k}: [${a}] vs [${b}] :: ${s[i].en} => ${o[i].zh}`);
    if (!o[i].zh || !String(o[i].zh).trim()) errs.push(`empty zh#${i} k=${s[i].k}`);
  }
  if (errs.length) { bad++; console.log(`${name}: FAIL (${errs.length})`); errs.slice(0, 40).forEach(e => console.log('   ' + e)); }
  else console.log(`${name}.zh.json items=${o.length} ok`);
}
process.exit(bad ? 1 : 0);
