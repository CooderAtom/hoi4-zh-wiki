// Reconcile data/images-missing.json against the built site.
//
// IMPORTANT (bug fixed here): site/images/ is a NESTED tree (e.g. images/NF_tree/...). Checking a
// basename against the top-level directory listing yields false "missing" reports for every image
// that lives in a subdirectory. Always resolve the FULL RELATIVE PATH.
//
// Classifies each logged name as: present on disk / not referenced at all (dropped MathJax stub) /
// referenced but genuinely absent (real miss).
import fs from 'node:fs';
import path from 'node:path';
const SITE = 'site';
const IMG = path.join(SITE, 'images');

// Build a set of every file in the image tree, as a path relative to site/.
const onDisk = new Set();
(function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), r);
    else onDisk.add(`images/${r}`);
  }
})(IMG, '');
console.log(`image files under site/images (recursive): ${onDisk.size}`);

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const refs = new Map(); // full relative path -> first page
let total = 0;
for (const f of fs.readdirSync(SITE).filter((x) => x.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  for (const m of html.matchAll(/<img[^>]*\ssrc="(images\/[^"]+)"/g)) {
    total++;
    const rel = decode(m[1]);
    if (!refs.has(rel)) refs.set(rel, f);
  }
}
console.log(`total <img> refs: ${total.toLocaleString()}   distinct paths: ${refs.size}`);
const trulyMissing = [...refs.keys()].filter((n) => !onDisk.has(n));
console.log(`referenced but absent on disk: ${trulyMissing.length}`);
for (const n of trulyMissing) console.log(`    ${n}   (first seen in ${refs.get(n)})`);

const logged = JSON.parse(fs.readFileSync('data/images-missing.json', 'utf8'));
console.log(`\nentries logged in data/images-missing.json: ${logged.length}`);
let present = 0, unreferenced = 0, real = 0;
for (const n of logged) {
  const rel = `images/${n}`;
  if (onDisk.has(rel)) { present++; continue; }
  if (refs.has(rel)) real++; else unreferenced++;
}
console.log(`  now present on disk (stale log)          : ${present}`);
console.log(`  not referenced anywhere (dropped stubs)  : ${unreferenced}`);
console.log(`  referenced AND absent (real misses)      : ${real}`);
console.log(`\n=> site integrity is governed by "referenced but absent on disk" = ${trulyMissing.length}`);
