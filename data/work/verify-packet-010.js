const fs = require('fs');
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const pairs = [['batch-027.json', 'batch-027.zh.json', 27], ['batch-028.json', 'batch-028.zh.json', 28]];
const tokens = s => (s.match(/⟦\d+⟧/g) || []);
let allOk = true;
for (const [srcName, outName, num] of pairs) {
  const srcBuf = fs.readFileSync(dir + srcName);
  const outBuf = fs.readFileSync(dir + outName);
  const src = JSON.parse(srcBuf.toString('utf8'));
  const out = JSON.parse(outBuf.toString('utf8'));
  const problems = [];
  if (outBuf[0] === 0xEF && outBuf[1] === 0xBB && outBuf[2] === 0xBF) problems.push('BOM present');
  if (out.batch !== num) problems.push('batch field=' + out.batch + ' expected ' + num);
  if (!Array.isArray(out.items)) problems.push('items not array');
  if (out.items.length !== src.units.length) problems.push('count ' + out.items.length + ' != ' + src.units.length);
  const keysOut = Object.keys(out);
  if (keysOut.length !== 2 || keysOut[0] !== 'batch' || keysOut[1] !== 'items') problems.push('top-level keys: ' + keysOut.join(','));
  const n = Math.min(out.items.length, src.units.length);
  let placeholderFails = 0, kFails = 0, itemKeyFails = 0, missing = 0, emptyZh = 0;
  for (let i = 0; i < n; i++) {
    const s = src.units[i], o = out.items[i];
    const itemKeys = Object.keys(o);
    if (itemKeys.length !== 2 || itemKeys[0] !== 'k' || itemKeys[1] !== 'zh') { itemKeyFails++; }
    if (o.k !== s.k) { kFails++; if (kFails < 4) problems.push('k mismatch at ' + i + ': ' + o.k + ' != ' + s.k); }
    if (typeof o.zh !== 'string' || o.zh.length === 0) { emptyZh++; continue; }
    const a = tokens(s.en), b = tokens(o.zh);
    if (a.join(',') !== b.join(',')) {
      placeholderFails++;
      if (placeholderFails < 6) problems.push('placeholder mismatch k=' + s.k + ' src=[' + a.join(' ') + '] out=[' + b.join(' ') + ']');
    }
    if (!o.zh.includes('⟦') && s.en.includes('⟦')) missing++;
    if (/<[a-zA-Z\/][^>]*>/.test(o.zh) && !/<[a-zA-Z\/][^>]*>/.test(s.en)) problems.push('HTML tag added at k=' + s.k);
  }
  console.log('--- ' + outName + ' ---');
  console.log('items=' + out.items.length + ' (src ' + src.units.length + ') kMismatch=' + kFails +
    ' placeholderMismatch=' + placeholderFails + ' itemShapeFails=' + itemKeyFails + ' emptyZh=' + emptyZh);
  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'ALL CHECKS PASSED');
  if (problems.length || kFails || placeholderFails || itemKeyFails || emptyZh) allOk = false;
  // cross-batch duplicate English -> different translation check
}
// consistency: same source en must map to same zh across the packet
const srcEn = new Map(), zhOf = new Map();
for (const [srcName, outName] of pairs) {
  const src = JSON.parse(fs.readFileSync(dir + srcName, 'utf8'));
  const out = JSON.parse(fs.readFileSync(dir + outName, 'utf8'));
  src.units.forEach((u, i) => {
    const prev = zhOf.get(u.en);
    if (prev !== undefined && prev !== out.items[i].zh) {
      console.log('INCONSISTENT translation for same en: "' + u.en.slice(0, 70) + '"');
      allOk = false;
    } else if (prev === undefined) { zhOf.set(u.en, out.items[i].zh); }
  });
}
console.log(allOk ? '\nOVERALL: OK' : '\nOVERALL: FAIL');
