// Coverage report that separates genuinely translatable prose from code identifiers.
// Identifiers (snake_case keys, assignments, file paths, brace stubs) must stay byte-identical
// to the game code, so counting them as "untranslated" understates real translation progress.
//   node tools/08c-real-coverage.mjs [--page Name] [--top N]
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';
import { Store } from './translate.mjs';
import { isTranslatableProse as isProse } from './classify.mjs';
import { isStructuralResidue } from './residue.mjs';

const argN = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? dflt : Number(process.argv[i + 1]);
};
const only = process.argv.includes('--page') ? process.argv[process.argv.indexOf('--page') + 1] : null;
const top = argN('--top', 12);

const units = readJson(path.join(DATA, 'units.json'), []);
const pageUnits = readJson(path.join(DATA, 'page-units.json'));
const store = new Store();

// A unit is code-like (not prose) when it has no sentence structure at all:
// no space-separated lowercase words forming a phrase, or it is a bare identifier / path / stub.
// isProse is an alias of isTranslatableProse (not of the old isCodeUnit), so this report now also
// excludes math markup and wiki template-diagnostic strings from the prose denominator. Note the
// polarity: it returns true for PROSE.

const rows = [];
let gProseT = 0, gProseA = 0, gCode = 0;
for (const [title, rec] of Object.entries(pageUnits)) {
  let pT = 0, pA = 0, cN = 0, cC = 0, uN = 0;
  // Leftovers split into two classes. "genuine" is real work; "structural" can never be stored
  // because Store.set() rejects zh === en, so it must not be counted as outstanding translation.
  let sLeft = 0, gLeft = 0, gUnits = 0, sUnits = 0;
  for (const k of rec.units) {
    const en = units.find((u) => u.k === k)?.en;
    if (!en) continue;
    if (!isProse(en)) { cN++; cC += en.length; continue; }
    uN++;
    pT += en.length;
    if (store.get(en)) { pA += en.length; continue; }
    if (isStructuralResidue(en)) { sLeft += en.length; sUnits++; } else { gLeft += en.length; gUnits++; }
  }
  gProseT += pT; gProseA += pA; gCode += cC;
  rows.push({
    title, slug: rec.slug, proseChars: pT, translatedChars: pA, pct: pT ? pA / pT : 1,
    units: uN, codeUnits: cN, codeChars: cC,
    structuralLeftChars: sLeft, structuralLeftUnits: sUnits,
    genuineLeftChars: gLeft, genuineLeftUnits: gUnits,
    // A page is "effectively complete" when every leftover is untranslatable residue.
    structuralOnly: gLeft === 0 && sLeft > 0,
  });
}
rows.sort((a, b) => b.proseChars - a.proseChars);
writeJson(path.join(DATA, 'coverage-real.json'), rows);

const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : 'n/a');
console.log(`pages=${rows.length}  prose chars=${gProseT.toLocaleString()}  translated=${gProseA.toLocaleString()}  real coverage=${pct(gProseA, gProseT)}`);
console.log(`code/identifier chars excluded=${gCode.toLocaleString()}`);
const band = (lo, hi) => rows.filter((r) => r.pct >= lo && r.pct < hi).length;
console.log(`fully translated (100%): ${rows.filter((r) => r.pct >= 0.999).length}  >=80%: ${rows.filter((r) => r.pct >= 0.8).length}  50-80%: ${band(0.5, 0.8)}  <10%: ${rows.filter((r) => r.pct < 0.1).length}`);

// --- structural vs genuine split of everything still untranslated ---
const totStruct = rows.reduce((s, r) => s + r.structuralLeftChars, 0);
const totGenuine = rows.reduce((s, r) => s + r.genuineLeftChars, 0);
const totGenuineUnits = rows.reduce((s, r) => s + r.genuineLeftUnits, 0);
const structOnly = rows.filter((r) => r.structuralOnly);
console.log('');
console.log(`untranslated split: genuine prose=${totGenuine.toLocaleString()} chars / ${totGenuineUnits.toLocaleString()} units   structural (untranslatable by design)=${totStruct.toLocaleString()} chars`);
console.log(`pages that will NEVER show 100% (only untranslatable leftovers): ${structOnly.length}  -> ${structOnly.map((r) => r.title).join(', ')}`);
console.log(`pages with genuine remaining prose: ${rows.filter((r) => r.genuineLeftChars > 0).length}`);
console.log(`ceiling if ALL genuine prose is translated: ${pct(gProseT - totStruct, gProseT)}`);

if (only) {
  const r = rows.find((x) => x.title === only);
  if (r) console.log(`\n${only}: real=${(r.pct * 100).toFixed(1)}%  prose=${r.proseChars}  translated=${r.translatedChars}  left=${r.proseChars - r.translatedChars}  codeExcluded=${r.codeChars}`);
  else console.log(`\npage not found: ${only}`);
} else {
  console.log(`\ntop ${top} pages by remaining untranslated prose:`);
  for (const r of rows.slice().sort((a, b) => (b.proseChars - b.translatedChars) - (a.proseChars - a.translatedChars)).slice(0, top)) {
    const left = r.proseChars - r.translatedChars;
    if (left <= 0) continue;
    console.log(`  ${String(left).padStart(7)} chars left  ${(r.pct * 100).toFixed(0).padStart(3)}%  ${r.title}`);
  }
}
