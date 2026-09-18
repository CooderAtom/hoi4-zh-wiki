// Retarget the 军种 hub sidebar entry from the "海战" page to the "海军" overview page.
// Anchored on the exact sidebar list-item markup (leading indent), NOT a blanket replace:
// 33 pages legitimately link Navy.html with the label 海军 in their CONTENT, and several
// pages link Naval_warfare.html as 海战 in content too, so a naive global swap would corrupt them.
//
// usage: node tools/scratch/fix-hub-navy.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';

const WRITE = process.argv.includes('--write');
const SITE = 'site';
// Two places render this hub label: the sidebar list item (present on every page) and the
// home page's 军种 hub box, which has a different markup shape (`<li><a …>海军</a> <span
// class="desc">…</span></li>`). Both must be retargeted; fixing only the sidebar left the home
// page still opening 海战.
const FROM = '<li><a href="Naval_warfare.html">海军</a></li>';
const TO = '<li><a href="Navy.html">海军</a></li>';
const FROM_HUB = '<li><a href="Naval_warfare.html">海军</a> <span class="desc">Naval warfare</span></li>';
const TO_HUB = '<li><a href="Navy.html">海军</a> <span class="desc">Navy</span></li>';

let files = 0, hits = 0, already = 0, hubHits = 0;
const leftovers = [];
for (const f of fs.readdirSync(SITE).filter((x) => x.endsWith('.html'))) {
  const p = path.join(SITE, f);
  let h = fs.readFileSync(p, 'utf8');
  const before = h;
  const n = h.split(FROM).length - 1;
  const hn = h.split(FROM_HUB).length - 1;
  if (h.includes(TO)) already++;
  if (n || hn) {
    if (n > 1) leftovers.push(`${f}: sidebar x${n} (unexpected)`);
    h = h.split(FROM).join(TO).split(FROM_HUB).join(TO_HUB);
    files++; hits += n; hubHits += hn;
    if (WRITE) fs.writeFileSync(p, h);
  }
  if (h !== before && !WRITE) { /* dry run */ }
}
console.log(`sidebar entry : "${FROM}"`);
console.log(`hub-box entry : "${FROM_HUB}"`);
console.log(`  files changed: ${files}   sidebar hits: ${hits}   hub-box hits: ${hubHits}`);
console.log(`  files already using the new sidebar link: ${already}`);
console.log(`  files with >1 sidebar occurrence: ${leftovers.length}`);
for (const l of leftovers.slice(0, 5)) console.log('    ' + l);
if (!WRITE) console.log('\n(dry run — pass --write)');
else console.log('\nWROTE');
