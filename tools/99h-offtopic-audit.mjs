// Round 50: enumerate the pages that are NOT HOI4 gameplay — publisher/corporate, wiki-meta,
// and non-game topics — so "delete the off-topic entry points" can be applied to a concrete,
// reviewed list rather than guessed at.
import fs from 'node:fs';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const pages = rows.map((r) => r.title);

// Patterns that indicate content OUTSIDE the game itself.
const RULES = [
  ['publisher / corporate', /^(Paradox|Paradox Interactive|Paradox Development Studio|Forum|Steam|Mod|Modding|Mods)$/i],
  ['wiki meta', /^(Hearts of Iron 4 Wiki|Hearts of Iron IV Wiki|Wiki|Main Page|Style|Manual of Style|Copyrights|Disclaimers|Wiki maintenance|To-do|Sandbox)$/i],
  ['wiki meta (contains)', /(Wiki|Style guide|Copyright|Disclaimer|To-do list|Community portal|Administration)/i],
  ['non-game topic', /^(Achievements? and|Soundtrack|Music|Development|Developer diaries|Merchandise|Books|Novels|Television|Film)/i],
];

const buckets = new Map(RULES.map(([n]) => [n, []]));
for (const t of pages) {
  for (const [name, re] of RULES) {
    if (re.test(t)) { buckets.get(name).push(t); break; }
  }
}
for (const [name, list] of buckets) {
  console.log('\n=== ' + name + ' (' + list.length + ') ===');
  for (const t of list.slice(0, 40)) console.log('  - ' + t);
  if (list.length > 40) console.log('  ... and ' + (list.length - 40) + ' more');
}

// Also: which pages are linked FROM the nav/index (i.e. are genuine entry points)?
const idx = fs.readFileSync('site/index.html', 'utf8');
console.log('\n=== entry-point check: do these appear as links in index.html? ===');
for (const t of ['Paradox', 'Hearts_of_Iron_4_Wiki', 'Forum', 'Achievements', 'Patches']) {
  const re = new RegExp('href="' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.html"');
  console.log('  ' + t.padEnd(24) + (re.test(idx) ? 'LINKED from index' : 'not linked from index'));
}
