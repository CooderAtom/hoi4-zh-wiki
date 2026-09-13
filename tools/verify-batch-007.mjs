import fs from 'node:fs';
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const errs = [];
if (out.batch !== 7) errs.push('batch mismatch: ' + out.batch);
if (!Array.isArray(out.items)) errs.push('items not array');
if (out.items.length !== src.units.length) errs.push(`count ${out.items.length} != ${src.units.length}`);
const tok = s => (s.match(/⟦\d+⟧/g) || []);
const n = Math.max(src.units.length, out.items ? out.items.length : 0);
for (let i = 0; i < n; i++) {
  const s = src.units[i], o = out.items[i];
  if (!o) { errs.push(`missing item ${i}`); continue; }
  if (o.k !== s.k) errs.push(`k[${i}] ${o.k} != ${s.k}`);
  if (typeof o.zh !== 'string' || !o.zh.trim()) errs.push(`empty zh[${i}] ${s.k}`);
  const a = tok(s.en).join(','), b = tok(o.zh).join(',');
  if (a !== b) errs.push(`tokens[${i}] ${s.k}: [${a}] != [${b}]`);
  if (/<[a-zA-Z/!]/.test(o.zh)) errs.push(`html?[${i}] ${s.k}`);
  const keys = Object.keys(o).join(',');
  if (keys !== 'k,zh') errs.push(`keys[${i}] ${keys}`);
  const numRe = /\d+(?:\.\d+)?/g;
  const numsA = (s.en.match(numRe) || []).join('|');
  const numsB = (o.zh.match(numRe) || []).join('|');
  if (numsA !== numsB) errs.push(`numbers[${i}] ${s.k}: ${numsA} != ${numsB}`);
}
// duplicate k check
const ks = new Set(src.units.map(u => u.k));
if (ks.size !== src.units.length) errs.push('source has duplicate k');
if (errs.length) { console.log('FAIL\n' + errs.join('\n')); process.exit(1); }
console.log(`OK items=${out.items.length} tokensVerified=true`);
