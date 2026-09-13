// The extractor blind spot: pages the pipeline reports as DONE (or nearly) that still render English.
//   node tools/scratch/gap-vs-visible.mjs [--minpct 0.9] [--top 40]
import fs from 'node:fs';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const minPct = Number(arg('minpct', 0.9));
const top = Number(arg('top', 40));

const visFile = (() => { const i = process.argv.indexOf('--file'); return i < 0 ? 'tools/scratch/visible-english.json' : process.argv[i + 1]; })();
const vis = JSON.parse(fs.readFileSync(visFile, 'utf8'));
const cov = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const bySlug = new Map(cov.map((c) => [c.slug, c]));

const rows = [];
for (const v of vis) {
  const c = bySlug.get(v.slug);
  if (!c) continue;
  if (c.pct < minPct) continue;
  rows.push({ slug: v.slug, title: c.title, pct: c.pct, visChars: v.chars, visRuns: v.n, genuineLeft: c.genuineLeftChars, hits: v.hits });
}
rows.sort((a, b) => b.visChars - a.visChars);
console.log('pages reported >=' + (minPct * 100) + '% done that still render english prose: ' + rows.length);
console.log('total residual visible english on those pages: ' + rows.reduce((s, r) => s + r.visChars, 0) + ' chars');
console.log('');
console.log('  visible   runs   pct     page');
for (const r of rows.slice(0, top)) {
  console.log(String(r.visChars).padStart(8) + '  x' + String(r.visRuns).padStart(4) + '  ' + (r.pct * 100).toFixed(1).padStart(5) + '%  ' + r.slug);
}
console.log('');
console.log('--- sample runs from the worst 6 pages ---');
for (const r of rows.slice(0, 6)) {
  console.log('');
  console.log('### ' + r.slug + '  (' + r.visChars + ' chars)');
  for (const h of r.hits.slice(0, 5)) console.log('   | ' + h.slice(0, 200));
}
