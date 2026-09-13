import fs from 'node:fs';
const N = Number(process.argv[2]);
const miss = JSON.parse(fs.readFileSync('tools/scratch/_missing.json', 'utf8'));
const s = (N - 1) * 50, e = Math.min(N * 50, miss.length);
console.log(miss.slice(s, e).map((it, i) => (s + i + 1) + '\t' + it.slug + '\t' + it.k + '\t' + it.en).join('\n'));
