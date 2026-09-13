const fs = require('fs');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const pairs = [['batch-096', 96], ['batch-097', 97]];
let allOk = true;
for (const [name, num] of pairs) {
  const src = JSON.parse(fs.readFileSync(dir + name + '.json', 'utf8'));
  const buf = fs.readFileSync(dir + name + '.zh.json');
  const problems = [];
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) problems.push('BOM present');
  let dst;
  try { dst = JSON.parse(buf.toString('utf8')); } catch (e) { problems.push('JSON parse: ' + e.message); }
  if (dst) {
    if (dst.batch !== num) problems.push('batch field = ' + JSON.stringify(dst.batch));
    if (!Array.isArray(dst.items)) problems.push('items not array');
    else {
      if (dst.items.length !== src.units.length) problems.push('count ' + dst.items.length + ' != ' + src.units.length);
      const n = Math.min(dst.items.length, src.units.length);
      for (let i = 0; i < n; i++) {
        const s = src.units[i], d = dst.items[i];
        if (Object.keys(d).join(',') !== 'k,zh') problems.push('item ' + i + ' keys=' + Object.keys(d).join(','));
        if (d.k !== s.k) problems.push('item ' + i + ' k ' + d.k + ' != ' + s.k);
        if (typeof d.zh !== 'string' || d.zh.length === 0) problems.push('item ' + i + ' zh empty/not string');
        const ph = str => (str.match(/⟦\s*\d+\s*⟧/g) || []);
        const a = ph(s.en), b = ph(d.zh);
        if (a.join('|') !== b.join('|')) problems.push('item ' + i + ' placeholders ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
        if (/<[a-zA-Z\/!]/.test(d.zh)) problems.push('item ' + i + ' possible HTML tag');
        if (/\[\[|\{\{|~~|''/.test(d.zh) && !/\[\[|\{\{|~~|''/.test(s.en)) problems.push('item ' + i + ' wiki markup added');
      }
      // duplicate k check
      const ks = dst.items.map(x => x.k);
      if (ks.length !== new Set(ks).size) problems.push('duplicate k');
    }
  }
  // duplicated en -> different zh consistency across the packet
  console.log(name + ': items=' + (dst && dst.items ? dst.items.length : 'n/a') + ' ' + (problems.length ? 'FAIL' : 'ok'));
  problems.forEach(p => { console.log('   - ' + p); allOk = false; });
}
console.log(allOk ? 'ALL CHECKS PASSED' : 'CHECKS FAILED');
