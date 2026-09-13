import fs from 'node:fs';
const [file, out] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const wrap = (s, w = 160) => {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).length > w && cur) { lines.push(cur); cur = word; }
    else cur = cur ? cur + ' ' + word : word;
  }
  if (cur) lines.push(cur);
  return lines.join('\n');
};
const parts = j.items.map((it) => `#### ${it.k}\n${wrap(it.en)}\n`);
fs.writeFileSync(out, parts.join('\n'), 'utf8');
console.log('wrote', j.items.length, 'items to', out);
