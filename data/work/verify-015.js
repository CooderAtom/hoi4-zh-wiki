const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const files = ['batch-064.json', 'batch-065.json'];

function toks(s) {
  return (s.match(/⟦\d+⟧/g) || []).join(',');
}

let allOk = true;
for (const f of files) {
  const src = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const outName = f.replace(/\.json$/, '.zh.json');
  const outPath = path.join(dir, outName);
  const errs = [];
  if (!fs.existsSync(outPath)) { console.log(`${f}: MISSING OUTPUT`); allOk = false; continue; }
  let out;
  try {
    out = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  } catch (e) {
    console.log(`${f}: JSON PARSE ERROR ${e.message}`); allOk = false; continue;
  }
  if (out.batch !== src.batch) errs.push(`batch number ${out.batch} != ${src.batch}`);
  if (!Array.isArray(out.items)) errs.push('items not array');
  else {
    if (out.items.length !== src.units.length) errs.push(`count ${out.items.length} != ${src.units.length}`);
    const n = Math.min(out.items.length, src.units.length);
    for (let i = 0; i < n; i++) {
      const a = src.units[i], b = out.items[i];
      if (a.k !== b.k) errs.push(`idx ${i}: k "${b.k}" != "${a.k}"`);
      const ta = toks(a.en), tb = toks(b.zh === undefined ? '' : b.zh);
      if (ta !== tb) errs.push(`idx ${i} (k=${a.k}): tokens [${tb}] != [${ta}]`);
      if (typeof b.zh !== 'string' || !b.zh.trim()) errs.push(`idx ${i} (k=${a.k}): empty zh`);
      if (/<[a-zA-Z\/][^>]*>/.test(b.zh || '')) errs.push(`idx ${i} (k=${a.k}): HTML tag found`);
      const extra = b.zh || '';
      if (/\[\[|\{\{|~~|''/.test(extra)) errs.push(`idx ${i} (k=${a.k}): wiki markup found`);
    }
  }
  // BOM check
  const buf = fs.readFileSync(outPath);
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) errs.push('BOM present');
  if (errs.length) { allOk = false; console.log(`${f}: ${errs.length} error(s)`); errs.forEach(e => console.log('   - ' + e)); }
  else console.log(`${outName} items=${out.items.length} ok`);
}
console.log(allOk ? 'ALL CHECKS PASSED' : 'CHECKS FAILED');
