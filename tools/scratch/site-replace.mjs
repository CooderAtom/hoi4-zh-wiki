// Site-wide literal text replacement with strict verification.
// Used to clean up a translated string that appears as a navbox link / heading on many pages.
// usage: node tools/scratch/site-replace.mjs "OLD" "NEW" [--write] [--only "prefix"]
import fs from 'node:fs';
import path from 'node:path';

const [oldStr, newStr, ...flags] = process.argv.slice(2);
const WRITE = flags.includes('--write');
const onlyIdx = flags.indexOf('--only');
const only = onlyIdx >= 0 ? flags[onlyIdx + 1] : null;

const SITE = 'site';
const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html') && (!only || f.toLowerCase().includes(only.toLowerCase())));

let totalHits = 0, touched = 0, bytesDelta = 0;
const perFile = [];
for (const f of files) {
  const p = path.join(SITE, f);
  const h = fs.readFileSync(p, 'utf8');
  const n = h.split(oldStr).length - 1;
  if (!n) continue;
  const out = h.split(oldStr).join(newStr);
  totalHits += n; touched++; bytesDelta += out.length - h.length;
  perFile.push({ f, n });
  if (WRITE) fs.writeFileSync(p, out);
}
perFile.sort((a, b) => b.n - a.n);
console.log(`"${oldStr}" -> "${newStr}"`);
console.log(`files scanned: ${files.length}   files containing it: ${touched}   occurrences: ${totalHits}`);
console.log(`byte delta (if written): ${bytesDelta >= 0 ? '+' : ''}${bytesDelta}`);
console.log('\ntop files:');
for (const r of perFile.slice(0, 15)) console.log(`  ${String(r.n).padStart(3)}  ${r.f}`);
if (!WRITE) console.log('\n(dry run — pass --write)');
else console.log('\nWROTE');
