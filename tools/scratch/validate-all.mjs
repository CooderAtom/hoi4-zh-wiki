// Validate every landed batch file in-process: placeholder-sequence equality (= 10e) and duplicate /
// identity keys (= 10c). In-process on purpose: the sandbox forbids capturing a spawned child's
// output through piped stdio, so spawning `node tools/10e-token-check.mjs` yields EPERM.
//   node tools/scratch/validate-all.mjs [globSubstring]
import fs from 'node:fs';

const filter = process.argv[2] || '';
const dir = 'data/pageblocks';
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u.en]));
const TOK = /⟦\s*(\d+)\s*⟧/g;
const seq = (s) => { const o = []; let m; TOK.lastIndex = 0; while ((m = TOK.exec(s || ''))) o.push(Number(m[1])); return o.join(','); };

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json') && f.includes(filter)).sort();
let items = 0;
const problems = [];
for (const f of files) {
  let b;
  try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch (e) { problems.push([f, 'PARSE FAIL ' + e.message]); continue; }
  const seen = new Set();
  const dups = [], shared = [], tok = [], noen = [];
  for (const it of b.items || []) {
    items++;
    if (seen.has(it.k)) dups.push(it.k);
    seen.add(it.k);
    const en = byK.get(it.k);
    if (en === undefined) { noen.push(it.k); continue; }
    if (it.zh === en) shared.push(it.k);
    const a = seq(en), z = seq(it.zh);
    if (a !== z) tok.push(it.k + ' en[' + a + '] zh[' + z + ']');
  }
  const errs = [];
  if (tok.length) errs.push('TOKEN MISMATCH x' + tok.length + ': ' + tok.slice(0, 3).join(' | '));
  if (dups.length) errs.push('DUP KEYS x' + dups.length + ': ' + dups.slice(0, 3).join(','));
  if (noen.length) errs.push('KEY NOT IN units.json x' + noen.length + ': ' + noen.slice(0, 3).join(','));
  if (errs.length) problems.push([f, errs.join('  ;;  ')]);
  else console.log('OK    ' + f.padEnd(46) + ' items=' + String((b.items || []).length).padStart(4) + '  sharedEnglish=' + shared.length);
}
console.log('');
console.log('files=' + files.length + '  items=' + items + '  failures=' + problems.length);
for (const [f, msg] of problems) console.log('  FAIL ' + f + ' -> ' + msg);
