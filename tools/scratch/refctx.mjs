// Compare published (older) vs local build: show what the English looked like before translation.
import fs from 'node:fs';

const [refFile, locFile, needle] = process.argv.slice(2);
const rd = (f) => { const h = fs.readFileSync(f, 'utf8'); const s = h.indexOf('mw-parser-output'); return h.slice(h.lastIndexOf('<div', s)); };

const ref = rd(refFile), loc = rd(locFile);

function ctx(txt, needle, before = 300, after = 900) {
  const i = txt.indexOf(needle);
  if (i < 0) return `(no "${needle}")`;
  return txt.slice(Math.max(0, i - before), i + after).replace(/<img[^>]*>/gi, '<img>');
}

console.log('==================== REFERENCE (published) ====================');
console.log(ctx(ref, needle));
console.log('\n==================== LOCAL (current build) ====================');
console.log(ctx(loc, needle));
