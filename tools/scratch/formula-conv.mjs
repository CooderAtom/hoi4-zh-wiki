// Find how prior sessions stored units that are formula/code-only (no English words to translate).
import fs from 'node:fs';
const tm = JSON.parse(fs.readFileSync('data/tm.json', 'utf8'));
const probes = [/^round\(/, /Bernoulli/, /\u230A/, /^[\d.]+x$/, /^forum:/, /^[A-Za-z_]+#/];
const hits = [];
for (const rec of Object.values(tm)) {
  if (!rec || !rec.en || !rec.zh) continue;
  if (probes.some((p) => p.test(rec.en.replace(/\u27E6\d+\u27E7/g, '').trim())) || probes.some((p) => p.test(rec.en))) {
    hits.push([rec.en, rec.zh]);
  }
}
hits.sort((a, b) => a[0].localeCompare(b[0]));
console.log('matches=' + hits.length);
for (const [en, zh] of hits.slice(0, 40)) console.log(JSON.stringify(en) + '\n   -> ' + JSON.stringify(zh));
