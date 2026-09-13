// Classify, for every page, whether its leftover prose units are STRUCTURAL residue
// (key names / tags / numbers / paths / formulas that zh===en and so can never be stored by Store.set)
// or GENUINE untranslated English prose.
import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse as isProse } from '../classify.mjs';

const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u]));
const store = new Store();

// structural = no run of >=2 consecutive lowercase alphabetic words of length >=2 (i.e. no real English phrase)
const STRUCT = (s) => {
  const words = s.split(/[^A-Za-z]+/).filter(Boolean);
  let run = 0;
  for (const w of words) {
    if (w.length >= 2 && w === w.toLowerCase()) { run++; if (run >= 2) return false; }
    else run = 0;
  }
  return true;
};

let structOnlyPages = 0, structOnlyChars = 0, genuinePages = 0, genuineChars = 0;
const genuineList = [];
for (const r of rows) {
  const rec = pageUnits[r.title];
  if (!rec) continue;
  let sChars = 0, gChars = 0, sN = 0, gN = 0;
  for (const k of rec.units) {
    const u = byK.get(k);
    if (!u || !isProse(u.en) || store.get(u.en)) continue;
    if (STRUCT(u.en)) { sChars += u.en.length; sN++; } else { gChars += u.en.length; gN++; }
  }
  if (sChars + gChars === 0) continue;
  if (gN === 0) { structOnlyPages++; structOnlyChars += sChars; }
  else { genuinePages++; genuineChars += gChars; genuineList.push({ title: r.title, g: gChars, s: sChars, pct: r.pct }); }
}

console.log('=== LEFTOVER CLASSIFICATION (all ' + rows.length + ' pages) ===');
console.log('pages whose ONLY leftovers are structural : ' + structOnlyPages + '   (chars ' + structOnlyChars + ')');
console.log('  -> these can NEVER reach 100% by design (zh===en is rejected by Store.set)');
console.log('pages with genuine untranslated prose     : ' + genuinePages + '   (chars ' + genuineChars + ')');
console.log('total leftover chars                      : ' + (structOnlyChars + genuineChars));

console.log('\n=== GENUINELY UNFINISHED, PATCHES EXCLUDED (top 30) ===');
const noPatch = genuineList.filter((x) => !/^Patch /.test(x.title)).sort((a, b) => b.g - a.g);
for (const x of noPatch.slice(0, 30)) {
  console.log('  genuine=' + String(x.g).padStart(7) + '  struct=' + String(x.s).padStart(5) + '  ' + (x.pct * 100).toFixed(1).padStart(5) + '%  ' + x.title);
}
let npl = 0; for (const x of noPatch) npl += x.g;
console.log('  -- non-patch genuine total: ' + npl + ' chars over ' + noPatch.length + ' pages');
