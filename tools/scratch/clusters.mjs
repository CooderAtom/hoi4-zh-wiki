// Group the genuine remaining work into actionable clusters, and sample the biggest hub-page gap.
import fs from 'node:fs';
import { Store } from '../translate.mjs';
import { isTranslatableProse as isProse } from '../classify.mjs';
import { HUBS } from '../registry.mjs';

const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const pageUnits = JSON.parse(fs.readFileSync('data/page-units.json', 'utf8'));
const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u]));
const store = new Store();

const KEYS = new Set(['ctrl', 'shift', 'alt', 'tab', 'esc']);
function isStructural(s) {
  const t = s.replace(/\u27E6\d+\u27E7/g, ' ').trim();
  if (t === '') return true;
  if (/[\\/]/.test(t) && /(Documents|Paradox|\.txt|\.json|\.mod|~\/)/i.test(t)) return true;
  if (/[Σ√π]/.test(t) || /^[A-Za-z]*\(.*[TΣ=].*\)/.test(t)) return true;
  if (/^[a-z][a-z0-9_]*$/.test(t)) return true;
  const parts = t.split(/\s*[+,]\s*/).filter(Boolean).map((p) => p.replace(/^[\^⇧⇆⌥]/, '').toLowerCase());
  if (parts.length > 0 && parts.every((p) => KEYS.has(p) || /^f\d{1,2}$/.test(p))) return true;
  if (/^[\d.,\s+\-%/]+[A-Za-z]{0,3}$/.test(t)) return true;
  const rest = t.replace(/\b[A-Z]{2,5}\b/g, ' ').replace(/\b[a-z]{2,6}\d{2,4}\b/g, ' ').replace(/[–—\-:]/g, ' ');
  if (!/[A-Za-z]{3,}/.test(rest)) return true;
  if (!/\s/.test(t) && /^[A-Za-z][A-Za-z0-9_.]*$/.test(t) && /[_0-9]/.test(t)) return true;
  return false;
}

const per = new Map();
for (const r of rows) {
  const rec = pageUnits[r.title];
  if (!rec) continue;
  let g = 0, gn = 0;
  const sample = [];
  for (const k of rec.units) {
    const u = byK.get(k);
    if (!u || !isProse(u.en) || store.get(u.en)) continue;
    if (isStructural(u.en)) continue;
    g += u.en.length; gn++;
    if (sample.length < 3) sample.push(u.en.replace(/\s+/g, ' ').slice(0, 90));
  }
  if (gn) per.set(r.title, { g, gn, pct: r.pct, sample });
}

const hubTitles = new Set();
for (const h of HUBS) for (const [t] of h.items) hubTitles.add(t);

const CLUSTERS = [
  ['A. index hub landing pages (not done)', (t) => hubTitles.has(t)],
  ['B. patch family', (t) => /^Patch /.test(t)],
  ['C. country pages (non-hub)', (t) => !hubTitles.has(t) && !/^Patch /.test(t) && !/modding|Modding|Defines|Triggers|Effect|Data structures|Localisation|Custom difficulty/i.test(t)],
  ['D. modding / scripting / defines', (t) => /modding|Modding|Defines|Triggers|Effect|Data structures|Localisation|Custom difficulty/i.test(t)],
];
const used = new Set();
console.log('=== WORK CLUSTERS (genuine untranslated only) ===');
for (const [name, fn] of CLUSTERS) {
  let c = 0, n = 0, pg = 0;
  for (const [t, v] of per) {
    if (used.has(t)) continue;
    if (!fn(t)) continue;
    used.add(t); c += v.g; n += v.gn; pg++;
  }
  console.log('  ' + name.padEnd(42) + ' chars=' + String(c).padStart(7) + '  units=' + String(n).padStart(6) + '  pages=' + pg);
}
let rc = 0, rn = 0, rp = 0;
for (const [t, v] of per) if (!used.has(t)) { rc += v.g; rn += v.gn; rp++; }
console.log('  ' + 'E. everything else'.padEnd(42) + ' chars=' + String(rc).padStart(7) + '  units=' + String(rn).padStart(6) + '  pages=' + rp);

console.log('\n=== SAMPLE: what the Achievements gap actually looks like ===');
const a = per.get('Achievements');
if (a) { console.log('  units=' + a.gn + ' chars=' + a.g); for (const s of a.sample) console.log('    | ' + s); }
