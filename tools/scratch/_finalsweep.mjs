// Full sweep of my 400-item range: count landed / same-as-EN / placeholder-order violations.
import fs from 'node:fs';
const canon = JSON.parse(fs.readFileSync('tools/scratch/bulk/BULK.ALL.json', 'utf8')).items.slice(0, 400);
const dir = 'data/pageblocks';
const landed = new Map();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) if (!landed.has(it.k)) landed.set(it.k, { zh: it.zh, f });
}
const TOK = /⟦\s*(\d+)\s*⟧/g;
const seq = (s) => { const o = []; let m; TOK.lastIndex = 0; while ((m = TOK.exec(s || ''))) o.push(Number(m[1])); return o.join(','); };
let miss = 0, same = 0, tok = 0, ok = 0;
const bad = [];
for (const c of canon) {
  const L = landed.get(c.k);
  if (!L) { miss++; bad.push('MISSING ' + c.k); continue; }
  if (L.zh === c.en) { same++; bad.push('SAME-EN ' + c.k); continue; }
  if (seq(L.zh) !== seq(c.en)) { tok++; bad.push('TOKEN ' + c.k + ' en[' + seq(c.en) + '] zh[' + seq(L.zh) + ']'); continue; }
  ok++;
}
console.log('range=400  ok=' + ok + '  missing=' + miss + '  sameAsEnglish=' + same + '  tokenMismatch=' + tok);
for (const b of bad.slice(0, 40)) console.log('  ' + b);
const byPage = new Map();
for (const c of canon) {
  const L = landed.get(c.k);
  const st = !L ? 'MISSING' : (L.zh === c.en ? 'SAME-EN' : (seq(L.zh) === seq(c.en) ? 'ok' : 'TOKEN'));
  if (!byPage.has(c.slug)) byPage.set(c.slug, { ok: 0, bad: 0 });
  const r = byPage.get(c.slug);
  if (st === 'ok') r.ok++; else r.bad++;
}
for (const [s, r] of byPage) console.log('  ' + (r.bad ? 'BAD ' : 'OK  ') + s.padEnd(46) + ' ok=' + r.ok + ' bad=' + r.bad);
