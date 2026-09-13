// Strict classifier for leftover prose units: which leftovers are genuinely untranslatable
// (game keys, tags, numbers, paths, formulas, key names) vs real English prose that SHOULD be translated.
import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse as isProse } from '../classify.mjs';

const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u]));
const store = new Store();

const KEYS = new Set(['ctrl', 'shift', 'alt', 'tab', 'esc', 'enter', 'space', 'f1', 'f2', 'f3', 'f4', 'f5',
  'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'home', 'end', 'del', 'delete', 'ins', 'pgup', 'pgdn',
  'up', 'down', 'left', 'right', 'lmb', 'rmb', 'mmb', 'numpad']);

function isStructural(s) {
  const t = s.replace(/\u27E6\d+\u27E7/g, ' ').trim();
  if (t === '') return true;                                     // only token placeholders
  if (/[\\/]/.test(t) && /(Documents|Paradox|\.txt|\.json|\.mod|~\/)/i.test(t)) return true;  // path
  if (/[Σ√π]/.test(t) || /^[A-Za-z]*\(.*[TΣ=].*\)/.test(t)) return true;                      // formula
  if (/^[a-z][a-z0-9_]*$/.test(t)) return true;                  // snake_case key
  // keyboard shortcut list: every '+'/','-separated part is a known key or a modifier symbol
  const parts = t.split(/\s*[+,]\s*/).filter(Boolean).map((p) => p.replace(/^[\^⇧⇆⌥]/, '').toLowerCase());
  if (parts.length > 0 && parts.every((p) => KEYS.has(p) || /^f\d{1,2}$/.test(p))) return true;
  // pure number + short unit (32.0 kn, 25%, 3.5 IC)
  if (/^[\d.,\s+\-%/]+[A-Za-z]{0,3}$/.test(t)) return true;
  // country tags / DLC ids + labels: strip 2-5 char UPPERCASE tokens and lowercase ids
  const rest = t.replace(/\b[A-Z]{2,5}\b/g, ' ').replace(/\b[a-z]{2,6}\d{2,4}\b/g, ' ').replace(/[–—\-:]/g, ' ');
  if (!/[A-Za-z]{3,}/.test(rest)) return true;
  // identifier-ish tokens only (e.g. "anti_air_4", "energy_ratio", "has_mastery_level")
  if (!/\s/.test(t) && /^[A-Za-z][A-Za-z0-9_.]*$/.test(t) && /[_0-9]/.test(t)) return true;
  return false;
}

let structOnlyPages = 0, structOnlyChars = 0, structCharsTotal = 0;
let genuineChars = 0, genuinePages = 0, genuineUnits = 0;
const list = [];
for (const r of rows) {
  const rec = pageUnits[r.title];
  if (!rec) continue;
  let s = 0, g = 0, gn = 0;
  for (const k of rec.units) {
    const u = byK.get(k);
    if (!u || !isProse(u.en) || store.get(u.en)) continue;
    if (isStructural(u.en)) s += u.en.length; else { g += u.en.length; gn++; }
  }
  structCharsTotal += s;
  if (s + g === 0) continue;
  if (gn === 0) { structOnlyPages++; structOnlyChars += s; }
  else { genuinePages++; genuineChars += g; genuineUnits += gn; list.push({ title: r.title, g, s, pct: r.pct }); }
}

const TOTAL = 4866916; // measured by 08c on this exact build
console.log('=== STRICT LEFTOVER CLASSIFICATION (all ' + rows.length + ' pages) ===');
console.log('pages whose ONLY leftovers are structural  : ' + structOnlyPages + '  chars=' + structOnlyChars + '  <-- can NEVER reach 100%');
console.log('pages with genuine untranslated prose      : ' + genuinePages + '  units=' + genuineUnits + '  chars=' + genuineChars);
console.log('structural chars found on genuine pages    : ' + (structCharsTotal - structOnlyChars));
console.log('structural total (all pages)               : ' + structCharsTotal);
console.log('check vs 08c total leftover ' + TOTAL + '  -> genuine+structural = ' + (genuineChars + structCharsTotal)
  + '  delta=' + (TOTAL - genuineChars - structCharsTotal));
console.log('=> achievable ceiling if ALL genuine prose translated: '
  + (100 * (8325776 - (TOTAL - genuineChars)) / 8325776).toFixed(1) + '%');

console.log('\n=== GENUINE WORK, EXCLUDING PATCH PAGES (top 25) ===');
const noPatch = list.filter((x) => !/^Patch /.test(x.title)).sort((a, b) => b.g - a.g);
for (const x of noPatch.slice(0, 25)) {
  console.log('  genuine=' + String(x.g).padStart(7) + '  (' + (x.pct * 100).toFixed(1).padStart(5) + '%)  ' + x.title);
}
let npl = 0, nplUnits = 0;
for (const x of noPatch) npl += x.g;
console.log('  -- non-patch genuine: ' + npl + ' chars / ' + noPatch.length + ' pages');
const patch = list.filter((x) => /^Patch /.test(x.title));
let pcl = 0; for (const x of patch) pcl += x.g;
console.log('  -- patch genuine   : ' + pcl + ' chars / ' + patch.length + ' pages');
