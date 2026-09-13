import fs from 'node:fs';
import path from 'node:path';

const dir = 'site';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
console.log('html files: ' + files.length);

const hits = [];
for (const f of files) {
  const h = fs.readFileSync(path.join(dir, f), 'utf8');
  if (h.includes('ab9e') && h.includes('1.9')) hits.push([f, h.includes('重大补丁'), h.includes('大型补丁')]);
}
console.log('files containing ab9e: ' + JSON.stringify(hits));

// Which pages actually contain the string 重大补丁 anywhere?
const withBig = [];
for (const f of files) {
  const h = fs.readFileSync(path.join(dir, f), 'utf8');
  if (h.includes('重大补丁')) withBig.push(f);
}
console.log('pages containing 重大补丁: ' + withBig.join(', '));

// And which contain the specific 1.9 row?
const h9 = fs.readFileSync('site/Patches.html', 'utf8');
const idx = h9.indexOf('ab9e');
console.log('\nPatches.html around ab9e:\n' + h9.slice(idx - 400, idx + 400));
