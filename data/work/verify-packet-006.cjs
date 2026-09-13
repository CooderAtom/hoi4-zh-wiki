const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'batches');
const TOKEN_RE = /⟦\s*(\d+)\s*⟧/g;
const toks = (s) => [...String(s).matchAll(TOKEN_RE)].map((m) => m[1]);
const nums = (s) => (String(s).match(/[+\-−]?\d+(?:[.,]\d+)?%?/g) || []);
let allOk = true;
for (const b of ['batch-019', 'batch-020']) {
  const src = JSON.parse(fs.readFileSync(path.join(dir, b + '.json'), 'utf8'));
  const zhPath = path.join(dir, b + '.zh.json');
  const raw = fs.readFileSync(zhPath);
  const bom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let zh;
  try { zh = JSON.parse(raw.toString('utf8')); } catch (e) { console.log(b, 'JSON PARSE FAIL', e.message); allOk = false; continue; }
  const problems = [];
  if (bom) problems.push('has BOM');
  if (typeof zh.batch !== 'number') problems.push('batch field missing/not number');
  if (Number(('' + b).slice(6)) !== zh.batch) problems.push('batch number mismatch: ' + zh.batch);
  if (!Array.isArray(zh.items)) problems.push('items not array');
  const items = zh.items || [];
  if (items.length !== src.units.length) problems.push(`count mismatch src=${src.units.length} out=${items.length}`);
  const n = Math.min(items.length, src.units.length);
  let tokBad = 0, numBad = 0, htmlBad = 0, asciiBad = 0, emptyBad = 0, dupZh = 0;
  const asciiWarn = [];
  const seenK = new Set();
  for (let i = 0; i < n; i++) {
    const s = src.units[i], o = items[i];
    if (o.k !== s.k) problems.push(`k mismatch at ${i}: src=${s.k} out=${o.k}`);
    if (seenK.has(o.k)) problems.push('duplicate k ' + o.k);
    seenK.add(o.k);
    const a = toks(s.en), c = toks(o.zh);
    if (a.join(',') !== c.join(',')) { tokBad++; problems.push(`placeholder mismatch [${s.k}] src=[${a}] out=[${c}]`); }
    const an = nums(s.en).join('|'), cn = nums(o.zh).join('|');
    if (an !== cn) { numBad++; problems.push(`number mismatch [${s.k}] src=[${an}] out=[${cn}] :: ${JSON.stringify(o.zh.slice(0, 50))}`); }
    if (/<[a-zA-Z/][^>]*>/.test(o.zh) && !/<[a-zA-Z/][^>]*>/.test(s.en)) { htmlBad++; problems.push('introduced html in ' + s.k); }
    if (!o.zh || !String(o.zh).trim()) { emptyBad++; problems.push('empty zh ' + o.k); }
    if (s.en.length > 8 && /^[\x00-\x7F\s]*$/.test(o.zh)) { asciiBad++; asciiWarn.push(`[${s.k}] ${JSON.stringify(s.en.slice(0, 60))}`); }
  }
  // consistency: same en -> same zh inside the packet (counts as cross-check)
  const byEn = new Map();
  for (let i = 0; i < n; i++) {
    const key = src.units[i].en;
    if (byEn.has(key) && byEn.get(key) !== items[i].zh) { dupZh++; problems.push('same EN translated two ways: ' + key.slice(0, 40)); }
    byEn.set(key, items[i].zh);
  }
  console.log(`--- ${b}: src=${src.units.length} out=${items.length} | placeholderBad=${tokBad} numberBad=${numBad} htmlBad=${htmlBad} emptyBad=${emptyBad} asciiOnly=${asciiBad} inconsistent=${dupZh} | batchField=${zh.batch} bom=${bom}`);
  if (problems.length) { allOk = false; console.log('   problems (' + problems.length + '):'); problems.slice(0, 40).forEach((p) => console.log('    - ' + p)); }
  else console.log('   ALL CHECKS PASS');
  if (asciiWarn.length) console.log('   info: kept unchanged by design (pure identifier / file path, EN>8 ascii-only): ' + asciiWarn.join(', '));
}
console.log(allOk ? 'RESULT: OK' : 'RESULT: FAIL');
