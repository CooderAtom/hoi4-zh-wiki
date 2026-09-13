// Measure the renderer blind spot: units that ARE registered by collectUnits and DO have a
// translation in the store, but that applyTranslations can never apply.
//
// Known unapplied classes:
//   - ctx 'inline:*'  : pass 2 explicitly refuses to rebuild inline elements (see NOTE in units.mjs)
//   - leaf <div>      : registered only if collectUnits learns to (it currently does not), but
//                       applyTranslations already supports isLeafDiv
// This script counts the first class, which is pure recoverable work: already paid for, never shown.
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { collectUnits, uniqueUnits, translatable } from '../units.mjs';
import { Store, normalize } from '../translate.mjs';

const files = process.argv.length > 2
  ? process.argv.slice(2)
  : fs.readdirSync('site').filter((f) => f.endsWith('.html')).map((f) => 'site/' + f);
const store = new Store();
let totUnits = 0, totChars = 0, withTr = 0, withTrChars = 0;
const perPage = [];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const dom = parse(html);
  const body = dom.descendants().find((e) => e.attr('id') === 'mw-content-text') || dom;
  const units = uniqueUnits(collectUnits(body));
  let cu = 0, cc = 0;
  for (const u of units) {
    if (!String(u.ctx || '').startsWith('inline:')) continue;
    if (u.fragments && u.fragments.length === 0) continue;   // plain inline label, pass 2 handles it
    if (!translatable(u.src)) continue;
    if (store.get(u.src) === undefined) continue;
    cu++; cc += normalize(u.src).length;
  }
  if (cu) perPage.push({ f, cu, cc });
  totUnits += cu; totChars += cc;
}
perPage.sort((a, b) => b.cc - a.cc);
console.log('files scanned=' + files.length);
console.log('inline units WITH a translation that the renderer never applies: units=' + totUnits + '  chars=' + totChars);
console.log('');
for (const p of perPage.slice(0, 25)) console.log('  ' + String(p.cc).padStart(6) + ' chars  x' + String(p.cu).padStart(4) + '  ' + p.f.replace(/^site[\\/]/, ''));
