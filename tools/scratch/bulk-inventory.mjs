// Inventory the BULK chunk files the agents wrote, parsing them in Node (PowerShell's
// ConvertFrom-Json chokes on these). Reports item counts and any JSON that does not parse.
import fs from 'node:fs';
const dir = 'data/pageblocks';
const files = fs.readdirSync(dir).filter((f) => /^BULK\..*\.zh\.json$/.test(f)).sort();
let ok = 0, bad = 0, items = 0;
for (const f of files) {
  const raw = fs.readFileSync(dir + '/' + f, 'utf8');
  try {
    const b = JSON.parse(raw);
    const n = (b.items || []).length;
    const noczh = (b.items || []).filter((i) => !i.zh || !i.page || !i.slug || !i.k).length;
    items += n; ok++;
    console.log('OK    ' + f.padEnd(34) + ' items=' + String(n).padStart(4) + (noczh ? '  BAD ITEMS=' + noczh : ''));
  } catch (e) {
    bad++;
    console.log('PARSE FAIL  ' + f + ' -> ' + e.message);
  }
}
console.log('');
console.log('parseable=' + ok + '  unparseable=' + bad + '  items=' + items);
