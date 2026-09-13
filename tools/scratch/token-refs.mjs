// Show what each ⟦n⟧ placeholder in a page's units actually renders to on the ORIGIN wiki page.
// Guessing a token's referent from the English sentence alone has repeatedly produced wrong
// Chinese word order (round 39: three failed attempts on one item). This prints the truth.
//   node tools/scratch/token-refs.mjs Intel
import fs from 'node:fs';
import { collectUnits } from '../units.mjs';
import { parse } from '../dom.mjs';

const page = process.argv[2];
const filter = process.argv[3];
if (!page) { console.error('usage: node tools/scratch/token-refs.mjs <Page> [key]'); process.exit(1); }

const candidates = [
  `cache/site-before-html/${page}.html`,
  `cache/site-before/${page}.html`,
];
const file = candidates.find((f) => fs.existsSync(f));
if (!file) { console.error('no origin html found for', page); process.exit(1); }

const dom = parse(fs.readFileSync(file, 'utf8'));
const units = collectUnits(dom);
for (const u of units) {
  if (filter && !String(u.src).includes(filter)) continue;
  const toks = [...String(u.src).matchAll(/⟦(\d+)⟧/g)].map((m) => +m[1]);
  if (!toks.length) continue;
  console.log('--- ' + String(u.src).slice(0, 90).replace(/\n/g, ' '));
  for (const i of toks) {
    const frag = u.fragments[i] ?? '(none)';
    console.log(`  ⟦${i}⟧ = ${String(frag).replace(/\s+/g, ' ').slice(0, 150)}`);
  }
}
