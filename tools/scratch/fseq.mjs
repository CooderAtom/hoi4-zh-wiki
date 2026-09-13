import fs from 'node:fs';
const f = process.argv[2];
const j = JSON.parse(fs.readFileSync(f, 'utf8'));
for (const it of j.items) {
  const seq = (it.en.match(/\u27E6\d+\u27E7/g) || []).join('');
  console.log(it.k + ' :: ' + seq);
}
