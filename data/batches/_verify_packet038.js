const fs = require('fs');
const path = require('path');

const dir = process.argv[2] || '.';
const pairs = [['batch-144', 144], ['batch-145', 145]];
let fail = 0;

function tokens(s) {
  const m = s.match(/⟦\d+⟧/g) || [];
  return m.join(',');
}

for (const [name, num] of pairs) {
  const src = JSON.parse(fs.readFileSync(path.join(dir, name + '.json'), 'utf8'));
  const outPath = path.join(dir, name + '.zh.json');
  const raw = fs.readFileSync(outPath);
  const problems = [];

  if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) problems.push('BOM present');

  let out;
  try { out = JSON.parse(raw.toString('utf8')); }
  catch (e) { console.log(`${name}.zh.json items=0 FAIL json: ${e.message}`); fail++; continue; }

  if (out.batch !== num) problems.push(`batch=${out.batch} expected ${num}`);
  if (!Array.isArray(out.items)) problems.push('items not array');

  const s = src.units, o = out.items;
  if (s.length !== o.length) problems.push(`count src=${s.length} out=${o.length}`);

  const n = Math.min(s.length, o.length);
  for (let i = 0; i < n; i++) {
    if (s[i].k !== o[i].k) problems.push(`k[${i}] src=${s[i].k} out=${o[i].k}`);
    if (typeof o[i].zh !== 'string' || o[i].zh.length === 0) problems.push(`zh[${i}] (${s[i].k}) empty/non-string`);
    const ts = tokens(s[i].en), to = tokens(o[i].zh);
    if (ts !== to) problems.push(`tokens[${i}] (${s[i].k}) src=[${ts}] out=[${to}]`);
    // markup parity: every tag-like token in the output must also appear in the source
    const tagRe = /<[a-zA-Z][a-zA-Z _\d]*>|<\/[a-zA-Z]+>/g;
    const srcTags = (s[i].en.match(tagRe) || []);
    const outTags = (o[i].zh.match(tagRe) || []);
    const extra = outTags.filter(t => !srcTags.includes(t));
    if (extra.length) problems.push(`markup[${i}] (${s[i].k}) unexpected: ${[...new Set(extra)].join(' ')}`);
    if (!/[㐀-鿿]/.test(o[i].zh) && /[a-zA-Z]{3,}/.test(s[i].en) && !/^[\x00-\x7F\s]*$/.test(o[i].zh.replace(/⟦\d+⟧/g, ''))) {
      problems.push(`latin-only[${i}] (${s[i].k}) no Chinese chars`);
    }
  }

  const keys = new Set(o.map(x => x.k));
  if (keys.size !== o.length) problems.push('duplicate k values');

  if (problems.length) { fail++; console.log(`${name}.zh.json items=${o.length} FAIL`); problems.slice(0, 20).forEach(p => console.log('   - ' + p)); }
  else console.log(`${name}.zh.json items=${o.length} ok`);
}

console.log(fail === 0 ? 'ALL CHECKS PASSED' : `${fail} FILE(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
