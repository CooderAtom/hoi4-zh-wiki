const fs = require('fs');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const files = ['batch-036.json', 'batch-037.json'];
const tokens = s => (s.match(/⟦\d+⟧/g) || []);
// numbers with optional sign (keeps the exact sign char, so −25% vs -25% vs –25% are distinguished)
const nums = s => (s.match(/[+\-\u2212\u2013]?\d+(?:[.,]\d+)?%?/g) || []);
let allOk = true;
for (const f of files) {
  const n = f.replace('.json', '');
  const src = JSON.parse(fs.readFileSync(dir + f, 'utf8'));
  const p = dir + n + '.zh.json';
  const buf = fs.readFileSync(p);
  const problems = [];
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) problems.push('BOM present');
  let zh;
  try { zh = JSON.parse(buf.toString('utf8')); } catch (e) { console.log(`${n}.zh.json items=0 FAIL (parse: ${e.message})`); allOk = false; continue; }
  if (zh.batch !== src.batch) problems.push(`batch mismatch ${zh.batch} != ${src.batch}`);
  if (!Array.isArray(zh.items)) { problems.push('items not array'); console.log(`${n}.zh.json FAIL`); allOk = false; continue; }
  if (zh.items.length !== src.units.length) problems.push(`count mismatch zh=${zh.items.length} src=${src.units.length}`);
  const lim = Math.min(zh.items.length, src.units.length);
  for (let i = 0; i < lim; i++) {
    const s = src.units[i], z = zh.items[i];
    if (z.k !== s.k) problems.push(`k mismatch @${i}: ${z.k} != ${s.k}`);
    if (typeof z.zh !== 'string' || !z.zh.trim()) problems.push(`empty zh @${i} k=${s.k}`);
    if (Object.keys(z).sort().join() !== 'k,zh') problems.push(`unexpected keys @${i}: ${Object.keys(z)}`);
    const st = tokens(s.en).join(','), zt = tokens(z.zh).join(',');
    if (st !== zt) problems.push(`placeholder mismatch k=${s.k}: src=[${st}] zh=[${zt}]`);
    if (/<[a-zA-Z\/!]/.test(z.zh)) problems.push(`HTML tag k=${s.k}`);
    if (/\[\[|\]\]|\{\{|\}\}/.test(z.zh)) problems.push(`wiki markup k=${s.k}`);
    const sn = nums(s.en), zn = nums(z.zh);
    const key = a => a.slice().sort().join('|');
    if (key(sn) !== key(zn)) problems.push(`numeric set mismatch k=${s.k}\n      src=[${sn.join(' ')}]\n      zh =[${zn.join(' ')}]`);
    else if (sn.join('|') !== zn.join('|')) problems.push(`note: numbers preserved but reordered k=${s.k}\n      src=[${sn.join(' ')}]\n      zh =[${zn.join(' ')}]`);
    // code identifiers must survive (snake_case + known file extensions)
    for (const t of new Set(s.en.match(/[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+|\b[\w-]+\.(?:txt|csv|json|lua|dds|tga|png|gfx|gui|yml)\b/g) || [])) {
      if (!z.zh.includes(t)) problems.push(`missing identifier "${t}" k=${s.k}`);
    }
  }
  if (problems.length) allOk = false;
  console.log(`${n}.zh.json items=${zh.items.length} ${problems.length ? 'FAIL' : 'ok'}`);
  problems.slice(0, 40).forEach(x => console.log('  - ' + x));
  if (problems.length > 40) console.log(`  ... and ${problems.length - 40} more`);
  if (!problems.length) console.log('  (JSON parses, no BOM, count/k/placeholder sequences identical, numbers preserved)');
}
console.log(allOk ? 'ALL PASS' : 'FAILURES PRESENT');
