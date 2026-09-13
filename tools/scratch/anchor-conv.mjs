// Show how already-merged TM entries handled raw wiki anchor link text (English containing '#').
import fs from 'node:fs';
const tm = JSON.parse(fs.readFileSync('data/tm.json', 'utf8'));
const rows = [];
for (const [k, rec] of Object.entries(tm)) {
  if (!rec || !rec.en || !rec.zh) continue;
  if (!rec.en.includes('#')) continue;
  if (rec.en === rec.zh) continue;
  if (rec.en.length > 80) continue;
  rows.push([rec.en, rec.zh]);
}
rows.sort((a, b) => a[0].localeCompare(b[0]));
console.log('entries with # and zh!==en (<=80 chars): ' + rows.length);
for (const [en, zh] of rows.slice(0, 60)) console.log(JSON.stringify(en) + '  ->  ' + JSON.stringify(zh));
