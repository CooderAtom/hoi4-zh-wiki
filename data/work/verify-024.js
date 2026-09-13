const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches';
const files = process.argv.slice(2);
let bad = 0;
for (const f of files) {
  const src = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const outPath = path.join(dir, f.replace(/\.json$/, '.zh.json'));
  if (!fs.existsSync(outPath)) { console.log(`${f} items=${src.units.length} MISSING-OUTPUT`); bad++; continue; }
  const raw = fs.readFileSync(outPath, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) { console.log(`${f} BOM-PRESENT`); bad++; }
  let out;
  try { out = JSON.parse(raw); } catch (e) { console.log(`${f} items=${src.units.length} JSON-PARSE-FAIL ${e.message}`); bad++; continue; }
  const errs = [];
  if (!Array.isArray(out.items)) errs.push('items-not-array');
  if (out.batch !== src.batch) errs.push(`batch-mismatch(${out.batch}!=${src.batch})`);
  const items = out.items || [];
  if (items.length !== src.units.length) errs.push(`count(${items.length}!=${src.units.length})`);
  const n = Math.min(items.length, src.units.length);
  const ph = s => (s.match(/⟦\d+⟧/g) || []).join(',');
  for (let i = 0; i < n; i++) {
    if (items[i].k !== src.units[i].k) errs.push(`k[${i}](${items[i].k}!=${src.units[i].k})`);
    if (ph(items[i].zh || '') !== ph(src.units[i].en)) errs.push(`ph[${i}:${src.units[i].k}](${ph(items[i].zh || '')}|${ph(src.units[i].en)})`);
    if (typeof items[i].zh !== 'string' || items[i].zh.trim() === '') errs.push(`empty[${i}:${src.units[i].k}]`);
    if (/<[a-zA-Z\/][^>]*>/.test(items[i].zh || '')) errs.push(`html[${i}:${src.units[i].k}]`);
    if (Object.keys(items[i]).length !== 2 || !('k' in items[i]) || !('zh' in items[i])) errs.push(`shape[${i}:${src.units[i].k}]`);
  }
  if (errs.length) { bad++; console.log(`${f} items=${items.length} FAIL: ${errs.slice(0, 12).join('; ')}${errs.length > 12 ? ` ...(+${errs.length - 12})` : ''}`); }
  else console.log(`${f} items=${items.length} ok`);
}
process.exit(bad ? 1 : 0);
