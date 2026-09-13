import fs from 'node:fs';
const want = process.argv[2];
const dir = 'data/pageblocks';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pr0000.json'));
const slug = (s) => s.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
const wantSlug = slug(want);
let hits = files.filter((f) => slug(f.replace('.pr0000.json', '')) === wantSlug);
if (hits.length === 0) {
  hits = files.filter((f) => {
    try {
      return JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')).page === want;
    } catch {
      return false;
    }
  });
}
if (hits.length === 0) {
  console.log('NO MATCH. available pages:');
  for (const f of files) {
    try {
      console.log('  ' + JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')).page);
    } catch {}
  }
  process.exit(0);
}
for (const f of hits) {
  const b = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  console.log('=== ' + b.page + ' (' + b.items.length + ') [file ' + f + '] ===');
  for (const it of b.items) {
    const seq = [...it.en.matchAll(/\u27E6(\d+)\u27E7/g)].map((m) => m[1]).join(',');
    console.log(it.k + ' [' + seq + '] :: ' + it.en.replace(/\n/g, ' '));
  }
}
