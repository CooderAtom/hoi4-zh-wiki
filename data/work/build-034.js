const fs = require('fs');
const base = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/';
const map = { 136: 'work/zh-136.txt', 137: 'work/zh-137.txt' };

function toks(s) { return (s.match(/\u27E6\d+\u27E7/g) || []); }

let allOk = true;
for (const n of Object.keys(map).map(Number)) {
  const src = JSON.parse(fs.readFileSync(base + 'batches/batch-' + n + '.json', 'utf8'));
  const raw = fs.readFileSync(base + map[n], 'utf8');
  let lines = raw.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const units = src.units;
  if (lines.length !== units.length) {
    console.log('COUNT MISMATCH', n, lines.length, units.length);
    allOk = false;
    continue;
  }
  const items = units.map((u, i) => ({ k: u.k, zh: lines[i] }));
  fs.writeFileSync(base + 'batches/batch-' + n + '.zh.json', JSON.stringify({ batch: n, items }, null, 1), 'utf8');
  // verify
  const out = JSON.parse(fs.readFileSync(base + 'batches/batch-' + n + '.zh.json', 'utf8'));
  let fails = [];
  if (out.batch !== n) fails.push('batch id');
  if (out.items.length !== units.length) fails.push('out count ' + out.items.length);
  units.forEach((u, i) => {
    const it = out.items[i];
    if (it.k !== u.k) fails.push('k@' + i + ' ' + it.k + '!=' + u.k);
    const a = toks(u.en), b = toks(it.zh);
    if (a.join(',') !== b.join(',')) fails.push('tok@' + i + '(' + u.k + ') src=[' + a + '] out=[' + b + ']');
    if (it.zh === '' || it.zh == null) fails.push('empty@' + i);
    // markup check: real HTML tags / entities / wikitext. Literal code tokens
    // such as <variable>, <state_id>, mio:<MIO>, sp:<special_project> are data.
    if (/<\/?[a-zA-Z][a-zA-Z0-9]*(\s[^>]*)?>/i.test(it.zh) || /&nbsp;|&amp;|\[\[|\{\{/.test(it.zh)) fails.push('markup@' + i + ' ' + it.zh);
  });
  // duplicate k check
  const ks = new Set(units.map(u => u.k));
  if (ks.size !== units.length) fails.push('dup k in source');
  console.log('batch-' + n + '.json items=' + units.length + (fails.length ? ' FAIL: ' + fails.slice(0, 10).join(' | ') : ' ok'));
  if (fails.length) allOk = false;
}
// confirm no BOM
for (const n of [136, 137]) {
  const buf = fs.readFileSync(base + 'batches/batch-' + n + '.zh.json');
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) { console.log('BOM in batch-' + n); allOk = false; }
}
console.log(allOk ? 'ALL OK' : 'PROBLEMS');
