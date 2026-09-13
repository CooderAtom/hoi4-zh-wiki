// Cross-file duplicate keys within one page: harmless if both files carry the same zh, a real
// order-dependent defect if they disagree. Also flags items appearing on the SAME page from
// different files with different Chinese.
//   node tools/scratch/xfile-conflicts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from '../lib.mjs';

const dir = path.join(DATA, 'pageblocks');
const byPageKey = new Map();   // page -> key -> [{file, zh}]
const pagesWithItem = new Map();

for (const f of fs.readdirSync(dir)) {
  if (!/\.zh\.json$/.test(f) || /^BULK\./.test(f)) continue;
  let b;
  try { b = readJson(path.join(dir, f)); } catch { continue; }
  if (!b || !b.page || !Array.isArray(b.items)) continue;
  for (const it of b.items || []) {
    if (!it.k) continue;
    const pk = b.page + '\u0000' + it.k;
    if (!byPageKey.has(pk)) byPageKey.set(pk, []);
    byPageKey.get(pk).push({ file: f, zh: it.zh });
    if (!pagesWithItem.has(b.page)) pagesWithItem.set(b.page, new Set());
    pagesWithItem.get(b.page).add(it.k);
  }
}

const conflicts = [];
const dupSame = [];
for (const [pk, list] of byPageKey) {
  if (list.length < 2) continue;
  const [page, k] = pk.split('\u0000');
  const uniq = new Set(list.map((x) => x.zh));
  if (uniq.size > 1) conflicts.push({ page, k, n: list.length, files: list.map((x) => x.file).join(' + '), vals: list.map((x) => (x.zh || '').slice(0, 40)) });
  else dupSame.push({ page, k, n: list.length });
}
console.log('duplicate (page,key) pairs = ' + (conflicts.length + dupSame.length) + '  ->  identical zh = ' + dupSame.length + '  CONFLICTING zh = ' + conflicts.length);
const byPage = new Map();
for (const c of conflicts) byPage.set(c.page, (byPage.get(c.page) || 0) + 1);
console.log('');
for (const [p, n] of [...byPage.entries()].sort((a, b) => b[1] - a[1])) console.log('  ' + String(n).padStart(4) + '  ' + p);
console.log('');
for (const c of conflicts.slice(0, 6)) {
  console.log('### ' + c.page + ' :: ' + c.k + '  (' + c.files + ')');
  for (const v of c.vals) console.log('     ' + v);
}
