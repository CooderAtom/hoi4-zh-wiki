const fs = require('fs');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';

function ph(s) {
  return (s.match(/⟦\d+⟧/g) || []);
}

let fail = 0;
for (const n of ['021', '022']) {
  const src = JSON.parse(fs.readFileSync(dir + 'batch-' + n + '.json', 'utf8'));
  const raw = fs.readFileSync(dir + 'batch-' + n + '.zh.json');
  const bom = raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF;
  const out = JSON.parse(raw.toString('utf8'));
  const problems = [];
  if (bom) problems.push('BOM present');
  if (out.batch !== src.batch) problems.push('batch id mismatch: ' + out.batch + ' vs ' + src.batch);
  if (!Array.isArray(out.items)) problems.push('items not an array');
  if (out.items.length !== src.units.length) problems.push('count ' + out.items.length + ' != ' + src.units.length);
  const extraKeys = Object.keys(out).filter(k => k !== 'batch' && k !== 'items');
  if (extraKeys.length) problems.push('extra top-level keys: ' + extraKeys.join(','));
  const numsMissing = [];
  const idMissing = [];
  const seen = new Map();
  const dupDiff = [];
  for (let i = 0; i < Math.min(out.items.length, src.units.length); i++) {
    const a = src.units[i], b = out.items[i];
    if (a.k !== b.k) problems.push('k mismatch at ' + i + ': ' + a.k + ' vs ' + b.k);
    if (Object.keys(b).length !== 2 || !('k' in b) || !('zh' in b)) problems.push('bad item shape at ' + i);
    if (typeof b.zh !== 'string' || !b.zh.trim()) problems.push('empty zh at ' + i + ' (' + b.k + ')');
    const pa = ph(a.en), pb = ph(b.zh);
    if (pa.join(',') !== pb.join(',')) problems.push('placeholder mismatch at ' + i + ' [' + b.k + ']: ' + pa.join(' ') + ' || ' + pb.join(' '));
    // HTML / wiki markup
    const tagsEn = (a.en.match(/<[^>]+>/g) || []);
    const tagsZh = (b.zh.match(/<[^>]+>/g) || []);
    if (tagsZh.length !== tagsEn.length) problems.push('html tag mismatch at ' + i + ' [' + b.k + ']: ' + tagsEn.join(' ') + ' || ' + tagsZh.join(' '));
    // numbers
    const numEn = (a.en.match(/\d+(?:[.,]\d+)?%?/g) || []);
    for (const t of numEn) if (!b.zh.includes(t)) numsMissing.push(i + ' [' + b.k + '] missing number ' + t);
    // identifiers / latin tokens that must survive
    const ids = [];
    for (const m of a.en.matchAll(/[A-Za-z0-9_\-\.\/]*\.(?:png|jpg|yml|php)\b[^\s]*/g)) ids.push(m[0]);
    for (const m of a.en.matchAll(/"[a-z_0-9]+"/g)) ids.push(m[0]);
    for (const m of a.en.matchAll(/'[a-z_]+'/g)) ids.push(m[0]);
    for (const m of a.en.matchAll(/\[Capital\]/g)) ids.push(m[0]);
    for (const m of a.en.matchAll(/\b(?:AND|II|DLC|ABDACOM|RTD|MP|CAS)\b/g)) ids.push(m[0]);
    for (const m of a.en.matchAll(/[A-Za-z_]+\.(?:png|jpg|yml|php)/g)) ids.push(m[0]);
    for (const t of new Set(ids)) if (!b.zh.includes(t)) idMissing.push(i + ' [' + b.k + '] missing id ' + t);
    // duplicate en must map to same zh
    if (seen.has(a.en) && seen.get(a.en) !== b.zh) dupDiff.push(i + ' [' + b.k + '] ' + a.en);
    seen.set(a.en, b.zh);
  }
  console.log('--- batch-' + n + '.zh.json: items=' + out.items.length + ' source=' + src.units.length +
    ' placeholdersOK=' + (problems.filter(p => p.startsWith('placeholder')).length === 0));
  if (problems.length) { fail++; console.log('PROBLEMS:'); problems.slice(0, 40).forEach(p => console.log('  ' + p)); }
  if (numsMissing.length) { console.log('NUM CHECK (' + numsMissing.length + '):'); numsMissing.slice(0, 40).forEach(p => console.log('  ' + p)); }
  if (idMissing.length) { console.log('ID CHECK (' + idMissing.length + '):'); idMissing.slice(0, 40).forEach(p => console.log('  ' + p)); }
  if (dupDiff.length) { console.log('DUP EN WITH DIFFERENT ZH (' + dupDiff.length + '):'); dupDiff.slice(0, 20).forEach(p => console.log('  ' + p)); }
  if (!problems.length && !numsMissing.length && !idMissing.length && !dupDiff.length) console.log('  ALL STRUCTURAL CHECKS PASS');
}
console.log(fail ? 'FAILED' : 'OK');
