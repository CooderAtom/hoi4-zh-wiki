// Show how the TM renders a family of short unit-ish strings (speed, multipliers, etc.).
import fs from 'node:fs';
const tm = JSON.parse(fs.readFileSync('data/tm.json', 'utf8'));
const probes = [/km\/h/i, /^\d+x$/, /^\d+x\u27E6/, /^\+?[\d.]+ km/];
const hits = [];
for (const rec of Object.values(tm)) {
  if (!rec || !rec.en || !rec.zh) continue;
  if (probes.some((p) => p.test(rec.en))) hits.push([rec.en, rec.zh]);
}
hits.sort((a, b) => a[0].localeCompare(b[0]));
console.log('matches=' + hits.length);
for (const [en, zh] of hits.slice(0, 45)) console.log(JSON.stringify(en) + '  ->  ' + JSON.stringify(zh));
