// Round 51: emit ALL items of an export as a ready-to-fill JSON skeleton, so a 115-item page can
// be translated in one pass without transcription error. Prints ONLY items that need words.
import fs from 'node:fs';
const f = process.argv[2];
const b = JSON.parse(fs.readFileSync('data/pageblocks/' + f, 'utf8'));
const numeric = /^[0-9.,%\s]+(\s*(kn|km\/h|knots|days?|%)|⟦\d+⟧)*$/i;
let skip = 0;
for (const it of b.items) {
  if (numeric.test(it.en.replace(/^⟦\d+⟧\s*/, '')) && !/[A-Za-z]{3,}/.test(it.en.replace(/⟦\d+⟧/g, ''))) { skip++; continue; }
  const seq = [...it.en.matchAll(/⟦(\d+)⟧/g)].map((m) => m[1]).join(',');
  console.log(JSON.stringify({ k: it.k, seq, en: it.en.replace(/\n/g, ' ') }));
}
console.error('numeric-only skipped: ' + skip + ' / ' + b.items.length);
