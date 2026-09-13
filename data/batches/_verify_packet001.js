const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\Atom\\Documents\\GeneralWS\\hoi4-zh-wiki\\data\\batches';

const packets = ['batch-034.json', 'batch-035.json'];
let allOk = true;

function tokens(s) {
  return (s.match(/⟦\d+⟧/g) || []);
}

for (const src of packets) {
  const n = path.basename(src, '.json');
  const zhPath = path.join(dir, n + '.zh.json');
  const problems = [];

  const sj = JSON.parse(fs.readFileSync(path.join(dir, src), 'utf8'));
  const raw = fs.readFileSync(zhPath);
  const buf = fs.readFileSync(zhPath);
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) problems.push('BOM present');

  let zj;
  try {
    zj = JSON.parse(raw.toString('utf8'));
  } catch (e) {
    console.log(`${n}.zh.json items=0 FAIL`);
    console.log('  JSON parse error: ' + e.message);
    allOk = false;
    continue;
  }

  if (!Array.isArray(zj.items)) problems.push('items is not an array');
  if (zj.batch !== sj.batch) problems.push(`batch mismatch: ${zj.batch} != ${sj.batch}`);

  const s = sj.units, z = zj.items || [];
  if (z.length !== s.length) problems.push(`count mismatch: zh=${z.length} src=${s.length}`);

  const lim = Math.min(s.length, z.length);
  for (let i = 0; i < lim; i++) {
    if (z[i].k !== s[i].k) problems.push(`k mismatch at index ${i}: zh=${z[i].k} src=${s[i].k}`);
    if (typeof z[i].zh !== 'string' || z[i].zh.length === 0) problems.push(`empty/non-string zh at index ${i} (k=${s[i].k})`);
    const st = tokens(s[i].en), zt = tokens(z[i].zh);
    if (st.join(',') !== zt.join(',')) {
      problems.push(`placeholder mismatch k=${s[i].k}: src=[${st}] zh=[${zt}]`);
    }
    // markup / HTML sanity
    if (/<[a-zA-Z\/!]/.test(z[i].zh)) problems.push(`possible HTML tag k=${s[i].k}`);
    if (/\[\[|\{\{|\]\]|\}\}/.test(z[i].zh)) problems.push(`wiki markup k=${s[i].k}`);
    // numeric / code-identifier preservation (conservative: only clear code/number tokens)
    const ident = s[i].en.match(/[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+|[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+|[+-]?\d+(?:\.\d+)?%?|\b[A-Za-z]:\\[^\s]+|[\w-]+\.(?:txt|csv|json|lua|dds|tga|png|gfx|gui|yml)\b/g) || [];
    for (const t of new Set(ident)) {
      if (/^[+-]?\d+(?:\.\d+)?%?$/.test(t)) {
        // numbers: require the same count in zh
        const cntEn = (s[i].en.match(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        const cntZh = (z[i].zh.split(t).length - 1);
        if (cntZh < cntEn) problems.push(`number "${t}" appears ${cntZh}x in zh but ${cntEn}x in src k=${s[i].k}`);
        continue;
      }
      if (!z[i].zh.includes(t)) problems.push(`missing identifier "${t}" k=${s[i].k}`);
    }
  }

  const status = problems.length ? 'FAIL' : 'ok';
  if (problems.length) allOk = false;
  console.log(`${n}.zh.json items=${z.length} ${status}`);
  for (const p of problems.slice(0, 25)) console.log('  - ' + p);
  if (problems.length > 25) console.log(`  ... and ${problems.length - 25} more`);
  if (!problems.length) {
    console.log(`  src units=${s.length}, k sequence identical, placeholder sequences identical`);
  }
}
console.log(allOk ? 'ALL PASS' : 'FAILURES PRESENT');
