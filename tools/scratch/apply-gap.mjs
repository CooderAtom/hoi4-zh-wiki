// How many units have a Chinese translation in the TM that never reaches the built page?
// For every page, take each unit that has a translation, and check whether a distinctive CJK
// fragment of that translation actually appears in site/<slug>.html. A miss means the renderer
// failed to apply a translation it had (the iluvwt class).
//   node tools/scratch/apply-gap.mjs [--minpct 1.0] [--top 15]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from '../lib.mjs';
import { Store } from '../translate.mjs';

const argN = (n, d) => { const i = process.argv.indexOf(n); return i === -1 ? d : Number(process.argv[i + 1]); };
const minPct = argN('--minpct', 1.0);
const top = argN('--top', 15);

const pageUnits = readJson(path.join(DATA, 'page-units.json'));
const units = readJson(path.join(DATA, 'units.json'), []);
const byK = new Map(units.map((u) => [u.k, u.en]));
const cov = readJson(path.join(DATA, 'coverage-real.json'), null);
const store = new Store();

const cjk = (s) => (s.match(/[\u4e00-\u9fff]{4,}/g) || []).sort((a, b) => b.length - a.length)[0] || null;

const rows = [];
let totalChecked = 0, totalMiss = 0;
for (const [title, rec] of Object.entries(pageUnits)) {
  const slug = (cov && cov.pages && cov.pages[title] && cov.pages[title].slug) || rec.slug;
  const file = path.join('site', slug + '.html');
  if (!fs.existsSync(file)) continue;
  if (cov && cov.pages && cov.pages[title] && typeof cov.pages[title].pct === 'number' && cov.pages[title].pct < minPct) continue;
  const html = fs.readFileSync(file, 'utf8');
  let checked = 0, miss = 0;
  const samples = [];
  for (const k of rec.units) {
    const en = byK.get(k);
    if (!en) continue;
    const zh = store.get(en);
    if (!zh) continue;
    const frag = cjk(zh);
    if (!frag || frag.length < 4) continue;
    checked++;
    if (!html.includes(frag)) { miss++; if (samples.length < 3) samples.push(k + ' :: ' + frag.slice(0, 24) + ' :: ' + (zh.slice(0, 60))); }
  }
  if (checked) { totalChecked += checked; totalMiss += miss; rows.push({ title, slug, checked, miss, samples }); }
}
rows.sort((a, b) => b.miss - a.miss);
console.log('pages inspected=' + rows.length + '  translated units checked=' + totalChecked + '  NOT rendered=' + totalMiss + '  (' + (totalMiss / Math.max(1, totalChecked) * 100).toFixed(2) + '%)');
console.log('');
for (const r of rows.slice(0, top)) {
  if (!r.miss) continue;
  console.log('  ' + String(r.miss).padStart(5) + ' /' + String(r.checked).padStart(5) + '  ' + r.title);
  for (const s of r.samples) console.log('        ' + s);
}
