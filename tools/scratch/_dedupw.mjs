// Remove stale twin batch files left by re-splitting, keeping the newest file for each page that
// has an exactly-duplicated key set. Prints what it removed.
import fs from 'node:fs';
const dir = 'data/pageblocks';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'));
const info = [];
for (const f of files) {
  let b; try { b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch { continue; }
  info.push({ f, page: b.page, keys: new Set((b.items || []).map((i) => i.k)), mtime: fs.statSync(dir + '/' + f).mtimeMs });
}
// group by page
const byPage = new Map();
for (const x of info) { if (!byPage.has(x.page)) byPage.set(x.page, []); byPage.get(x.page).push(x); }
let removed = 0;
for (const [page, list] of byPage) {
  if (list.length < 2) continue;
  // sort newest first; remove any older file whose key set is a subset of an already-kept file
  list.sort((a, b) => b.mtime - a.mtime);
  const kept = [];
  for (const x of list) {
    const covered = kept.some((kv) => [...x.keys].every((k) => kv.has(k)));
    if (covered && x.keys.size > 0) {
      fs.unlinkSync(dir + '/' + x.f);
      console.log('removed ' + x.f + ' (page "' + page + '", ' + x.keys.size + ' keys already in a newer batch)');
      removed++;
    } else kept.push(x.keys);
  }
}
console.log('removedTotal=' + removed);
