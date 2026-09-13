import fs from 'node:fs';
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u.en]));
const TOK = /⟦\s*(\d+)\s*⟧/g;
const seq = (s) => { const o = []; let m; TOK.lastIndex = 0; while ((m = TOK.exec(s || ''))) o.push(Number(m[1])); return o.join(','); };
for (const f of process.argv.slice(2)) {
  const b = JSON.parse(fs.readFileSync(f, 'utf8'));
  let bad = 0, same = 0, miss = 0;
  const K = new Set();
  for (const it of b.items) {
    K.add(it.k);
    const en = byK.get(it.k);
    if (en === undefined) { console.log('MISS ' + it.k); miss++; continue; }
    if (it.zh === en) { console.log('SAME-EN ' + it.k + ' :: ' + it.zh); same++; }
    if (seq(en) !== seq(it.zh)) { console.log('TOK ' + it.k + ' en[' + seq(en) + '] zh[' + seq(it.zh) + ']'); bad++; }
  }
  console.log(f + '  count=' + b.items.length + '  uniq=' + K.size + '  tokBad=' + bad + '  sameEn=' + same + '  miss=' + miss);
}
