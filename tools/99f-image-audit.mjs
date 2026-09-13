// Authoritative image-reference audit. Does NOT rely on fs.existsSync (case-insensitive on
// Windows/macOS, which silently hides case mismatches that break on a case-sensitive server).
// Compares against the real directory listing, exactly as a static host would.
import fs from 'node:fs';
import path from 'node:path';
const SITE = 'site';
const IMG = path.join(SITE, 'images');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const files = new Set(fs.readdirSync(IMG, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name));
const lower = new Map(); // lowercase -> real name
for (const n of files) lower.set(n.toLowerCase(), n);

const refs = new Map(); // referenced basename -> {count, pages:Set}
let total = 0;
for (const f of fs.readdirSync(SITE).filter((x) => x.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  for (const m of html.matchAll(/<img[^>]*\ssrc="images\/([^"]+)"/g)) {
    total++;
    const nm = decode(m[1]);
    if (!refs.has(nm)) refs.set(nm, { count: 0, pages: new Set() });
    const r = refs.get(nm);
    r.count++;
    if (r.pages.size < 3) r.pages.add(f);
  }
}
console.log(`image files on disk        : ${files.size}`);
console.log(`total <img> refs           : ${total.toLocaleString()}`);
console.log(`distinct referenced names  : ${refs.size}`);

const exactMissing = [], caseOnly = [], trulyAbsent = [];
for (const nm of refs.keys()) {
  if (files.has(nm)) continue;
  const real = lower.get(nm.toLowerCase());
  if (real) caseOnly.push([nm, real]);
  else trulyAbsent.push(nm);
}
console.log(`\nA) exact name present                     : ${refs.size - caseOnly.length - trulyAbsent.length}`);
console.log(`B) CASE-ONLY mismatch (breaks on Linux)   : ${caseOnly.length}`);
console.log(`C) truly absent from disk                 : ${trulyAbsent.length}`);

console.log('\n--- B) case-only mismatches ---');
for (const [want, real] of caseOnly.sort()) {
  const r = refs.get(want);
  console.log(`  ${want}  ->  ${real}   x${r.count}  e.g. ${[...r.pages][0]}`);
}
console.log('\n--- C) truly absent ---');
for (const nm of trulyAbsent.sort()) {
  const r = refs.get(nm);
  console.log(`  ${nm}   x${r.count}  e.g. ${[...r.pages][0]}`);
}
// Exit non-zero only when the site is actually broken (case mismatch or absent file).
process.exitCode = (caseOnly.length || trulyAbsent.length) ? 1 : 0;
