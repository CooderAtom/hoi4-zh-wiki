const fs = require('fs');
const base = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const files = ['batch-142', 'batch-143'];
let allOk = true;

function toks(s) {
  const m = String(s).match(/⟦\d+⟧/g) || [];
  return m.join(' ');
}
function stripBom(s) {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

for (const f of files) {
  const raw = fs.readFileSync(base + f + '.json', 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) { console.log(f + ': ERROR BOM present in source?'); }
  const src = JSON.parse(raw);
  const zhPath = base + f + '.zh.json';
  const zraw = fs.readFileSync(zhPath, 'utf8');
  const problems = [];
  if (zraw.charCodeAt(0) === 0xFEFF) problems.push('output has BOM');
  let out;
  try { out = JSON.parse(zraw); } catch (e) { problems.push('JSON parse error: ' + e.message); }
  if (out) {
    // top-level shape
    const keys = Object.keys(out);
    if (keys.length !== 2 || keys[0] !== 'batch' || keys[1] !== 'items') problems.push('top-level keys = ' + JSON.stringify(keys));
    if (out.batch !== src.batch) problems.push('batch mismatch ' + out.batch + ' vs ' + src.batch);
    if (!Array.isArray(out.items)) problems.push('items not array');
    else {
      if (out.items.length !== src.units.length) problems.push('count ' + out.items.length + ' vs ' + src.units.length);
      const n = Math.min(out.items.length, src.units.length);
      for (let i = 0; i < n; i++) {
        const a = src.units[i], b = out.items[i];
        if (b.k !== a.k) problems.push('k[' + i + '] ' + b.k + ' vs ' + a.k);
        if (Object.keys(b).length !== 2 || !('k' in b) || !('zh' in b)) problems.push('item[' + i + '] keys ' + JSON.stringify(Object.keys(b)));
        const ts = toks(a.en), tz = toks(b.zh);
        if (ts !== tz) problems.push('tokens[' + i + '] k=' + a.k + ' src="' + ts + '" zh="' + tz + '"');
        if (typeof b.zh !== 'string' || b.zh.trim() === '') problems.push('empty zh at ' + i + ' k=' + a.k);
        // untranslated check: identical to source and contains latin words
        if (b.zh === a.en && /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(a.en) && !/^[A-Za-z0-9_<>{}\[\]=\.\/\*\\|# -]+$/.test(a.en)) {
          problems.push('possibly untranslated[' + i + '] k=' + a.k);
        }
        // html tag check
        if (/<[a-zA-Z\/][^>]*>/.test(b.zh)) {
          const srcTags = (a.en.match(/<[a-zA-Z\/][^>]*>/g) || []).join(',');
          const zhTags = (b.zh.match(/<[a-zA-Z\/][^>]*>/g) || []).join(',');
          if (srcTags !== zhTags) problems.push('tag mismatch[' + i + '] k=' + a.k + ' src="' + srcTags + '" zh="' + zhTags + '"');
        }
        // duplicate k check
      }
      const seen = new Set();
      for (const it of out.items) { if (seen.has(it.k)) problems.push('duplicate k ' + it.k); seen.add(it.k); }
    }
  }
  if (problems.length) { allOk = false; console.log(f + ' items=' + src.units.length + ' FAIL'); problems.slice(0, 40).forEach(p => console.log('   - ' + p)); if (problems.length > 40) console.log('   ... ' + (problems.length - 40) + ' more'); }
  else console.log(f + ' items=' + src.units.length + ' ok');
}
console.log(allOk ? 'ALL OK' : 'FAILURES PRESENT');
