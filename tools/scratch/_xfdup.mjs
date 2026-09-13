// Report keys that appear in MORE THAN ONE landed batch file (cross-file duplicates).
import fs from 'node:fs';
const dir = 'data/pageblocks';
const byK = new Map();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'))) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  for (const it of b.items || []) {
    if (!byK.has(it.k)) byK.set(it.k, []);
    byK.get(it.k).push(f);
  }
}
let n = 0;
for (const [k, fs_] of byK) if (fs_.length > 1) { n++; if (n <= 80) console.log(k + '  ' + fs_.join(' , ')); }
console.log('crossFileDupKeys=' + n);
