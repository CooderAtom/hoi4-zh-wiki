const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches';
const files = ['batch-146.json', 'batch-147.json'];
let bad = 0;
for (const f of files) {
  const src = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const outName = f.replace(/\.json$/, '.zh.json');
  const buf = fs.readFileSync(path.join(dir, outName));
  const problems = [];
  const hasBOM = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  if (hasBOM) problems.push('file has UTF-8 BOM');
  let out;
  try { out = JSON.parse(buf.toString('utf8')); } catch (e) { problems.push('JSON parse error: ' + e.message); }
  if (out) {
    if (out.batch !== src.batch) problems.push(`batch field ${out.batch} != ${src.batch}`);
    if (!Array.isArray(out.items)) problems.push('items is not an array');
    else {
      if (out.items.length !== src.units.length) problems.push(`count ${out.items.length} != ${src.units.length}`);
      const ph = s => (s.match(/\u27E6\d+\u27E7/g) || []).join(',');
      const htmlRe = /<\/?(div|span|p|br|a|b|i|em|table|tr|td|th|ul|ol|li|h[1-6])\b[^>]*>/i;
      const wikiRe = /(\[\[|\]\]|\{\{|wiki)/;
      const seen = new Set();
      const n = Math.min(out.items.length, src.units.length);
      for (let i = 0; i < n; i++) {
        const a = src.units[i], b = out.items[i];
        if (a.k !== b.k) problems.push(`k[${i}] src=${a.k} zh=${b.k}`);
        if (Object.keys(b).length !== 2 || !('k' in b) || !('zh' in b)) problems.push(`keys[${i}] unexpected shape`);
        if (typeof b.zh !== 'string' || b.zh.trim() === '') problems.push(`empty zh at index ${i} (k=${a.k})`);
        const pa = ph(a.en), pb = ph(b.zh || '');
        if (pa !== pb) problems.push(`placeholders[${i}] k=${a.k} src=[${pa}] zh=[${pb}]`);
        if (htmlRe.test(b.zh || '')) problems.push(`html tag introduced at ${i} k=${a.k}`);
        if (wikiRe.test(b.zh || '') && !wikiRe.test(a.en)) problems.push(`wiki markup at ${i} k=${a.k}`);
        if (seen.has(b.k)) problems.push(`duplicate k ${b.k}`);
        seen.add(b.k);
      }
    }
  }
  const status = problems.length ? 'FAIL' : 'ok';
  console.log(`${outName} items=${out ? (out.items || []).length : '?'}/${src.units.length} ${status}`);
  problems.slice(0, 25).forEach(p => console.log('   - ' + p));
  if (problems.length) bad++;
}
process.exit(bad ? 1 : 0);
