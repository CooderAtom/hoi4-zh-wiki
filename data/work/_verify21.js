const fs = require('fs');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const files = ['batch-076', 'batch-077'];
let bad = 0;
const notes = [];
for (const f of files) {
  const srcRaw = fs.readFileSync(dir + f + '.json', 'utf8');
  const zhRaw = fs.readFileSync(dir + f + '.zh.json', 'utf8');
  const src = JSON.parse(srcRaw);
  const zh = JSON.parse(zhRaw);

  const errs = [];
  if (zhRaw.charCodeAt(0) === 0xFEFF) errs.push('BOM present');
  if (src.batch !== zh.batch) errs.push('batch number mismatch: ' + zh.batch);
  if (!Array.isArray(zh.items)) errs.push('items is not an array');
  if (zh.items.length !== src.units.length) errs.push('count ' + zh.items.length + ' != ' + src.units.length);

  const n = Math.min(zh.items.length, src.units.length);
  for (let i = 0; i < n; i++) {
    const s = src.units[i], t = zh.items[i];
    if (t.k !== s.k) errs.push('k mismatch at ' + i + ': ' + t.k + ' != ' + s.k);
    if (typeof t.zh !== 'string' || t.zh.trim() === '') errs.push('empty/missing zh at ' + i + ' (' + s.k + ')');
    const ph = x => (x.match(/⟦\d+⟧/g) || []).join(',');
    if (ph(s.en) !== ph(t.zh)) errs.push('placeholder mismatch at ' + i + ' (' + s.k + '): [' + ph(s.en) + '] vs [' + ph(t.zh) + ']');
    if (/<[a-zA-Z\/][^>]*>/.test(t.zh)) errs.push('HTML-ish tag at ' + i + ' (' + s.k + ')');
    if (/\[\[|\{\{|'''|''/.test(t.zh)) errs.push('wiki markup at ' + i + ' (' + s.k + ')');
    // untranslated check: identical to English (allowed only for pure identifiers)
    if (t.zh === s.en && /[A-Za-z]/.test(s.en) && !/^[\x20-\x7E]+$/.test(s.en)) errs.push('non-ascii source left identical at ' + i + ' (' + s.k + ')');
  }
  const extraKeys = Object.keys(zh).filter(k => !['batch', 'items'].includes(k));
  if (extraKeys.length) errs.push('extra top-level keys: ' + extraKeys.join(','));

  console.log(f + '.zh.json items=' + zh.items.length + ' src=' + src.units.length + ' => ' + (errs.length ? 'FAIL' : 'ok'));
  errs.forEach(e => { bad++; console.log('  ! ' + e); });
}
console.log(bad === 0 ? 'ALL CHECKS PASSED' : 'TOTAL PROBLEMS: ' + bad);
