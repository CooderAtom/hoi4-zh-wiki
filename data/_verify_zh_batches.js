// Structural verifier for translated batch files.
// Usage: node _verify_zh_batches.js 118 119 120 ...
// Or:    node _verify_zh_batches.js 118-135
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'batches');
const args = process.argv.slice(2);
const nums = [];
for (const a of args) {
  const m = /^(\d+)-(\d+)$/.exec(a);
  if (m) { for (let i = +m[1]; i <= +m[2]; i++) nums.push(i); }
  else nums.push(parseInt(a, 10));
}
if (nums.length === 0) {
  console.log('usage: node _verify_zh_batches.js 118 119 120');
  process.exit(2);
}

let allOk = true;
for (const num of nums) {
  const name = 'batch-' + String(num).padStart(3, '0');
  const srcPath = path.join(dir, name + '.json');
  const outPath = path.join(dir, name + '.zh.json');
  const errs = [];
  if (!fs.existsSync(srcPath)) { console.log(name + ': MISSING SOURCE'); allOk = false; continue; }
  if (!fs.existsSync(outPath)) { console.log(name + ': MISSING OUTPUT ' + outPath); allOk = false; continue; }
  let s;
  try { s = JSON.parse(fs.readFileSync(srcPath, 'utf8')); }
  catch (e) { console.log(name + ': SRC JSON ERROR ' + e.message); allOk = false; continue; }
  const buf = fs.readFileSync(outPath);
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) errs.push('BOM present');
  let o;
  try { o = JSON.parse(buf.toString('utf8')); }
  catch (e) { console.log(name + ': OUT JSON ERROR ' + e.message); allOk = false; continue; }
  if (o.batch !== s.batch) errs.push('batch field ' + JSON.stringify(o.batch) + ' != ' + s.batch);
  if (!Array.isArray(o.items)) { errs.push('items is not an array'); }
  else {
    if (o.items.length !== s.units.length) errs.push('item count ' + o.items.length + ' != ' + s.units.length);
    const n = Math.min(o.items.length, s.units.length);
    for (let i = 0; i < n; i++) {
      const su = s.units[i], oi = o.items[i] || {};
      if (oi.k !== su.k) errs.push('k[' + i + '] ' + JSON.stringify(oi.k) + ' != ' + JSON.stringify(su.k));
      const extra = Object.keys(oi).filter(k => k !== 'k' && k !== 'zh');
      if (extra.length) errs.push('extra keys[' + i + '] ' + extra.join(','));
      if (typeof oi.zh !== 'string') { errs.push('zh[' + i + '] not a string (k=' + su.k + ')'); continue; }
      if (oi.zh.length === 0) errs.push('zh[' + i + '] empty (k=' + su.k + ')');
      const te = (su.en.match(/⟦\d+⟧/g) || []).join(',');
      const tz = (oi.zh.match(/⟦\d+⟧/g) || []).join(',');
      if (te !== tz) errs.push('tokens[' + i + '] [' + te + '] != [' + tz + '] (k=' + su.k + ')');
      const le = (su.en.match(/⟦/g) || []).length, re = (su.en.match(/⟧/g) || []).length;
      const lz = (oi.zh.match(/⟦/g) || []).length, rz = (oi.zh.match(/⟧/g) || []).length;
      if ((lz !== rz) || (lz !== le)) errs.push('token bracket count[' + i + '] src=' + le + '/' + re + ' zh=' + lz + '/' + rz + ' (k=' + su.k + ')');
      if (/<[a-zA-Z\/!]/.test(oi.zh)) errs.push('looks like HTML tag[' + i + '] (k=' + su.k + ')');
      if (/\[\[|\{\{/.test(oi.zh)) errs.push('looks like wiki markup[' + i + '] (k=' + su.k + ')');
      if (/[A-Za-z]{4,}/.test(oi.zh) && !/[A-Za-z]{4,}/.test(su.en)) errs.push('unexpected latin text[' + i + '] (k=' + su.k + ')');
    }
  }
  if (errs.length) {
    allOk = false;
    console.log(name + ': FAIL (' + errs.length + ' issue(s))');
    errs.slice(0, 25).forEach(e => console.log('   ' + e));
    if (errs.length > 25) console.log('   ...+' + (errs.length - 25) + ' more');
  } else {
    console.log(name + ': OK items=' + o.items.length);
  }
}
console.log(allOk ? 'ALL OK' : 'FAILURES PRESENT');
process.exit(allOk ? 0 : 1);
