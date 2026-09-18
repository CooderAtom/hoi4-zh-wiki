// Dump every composite unit (sentence with ⟦n⟧ placeholders) that is NOT yet in the TM,
// together with what each placeholder stands for, so it can be translated as a whole unit.
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { collectUnits } from '../units.mjs';
import { Store } from '../translate.mjs';

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const s = html.indexOf('mw-parser-output');
const root = parse(html.slice(html.lastIndexOf('<div', s), html.indexOf('</main>', s)));
const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));
const store = new Store();

const units = collectUnits(body);
let n = 0;
for (const u of units) {
  if (!u.src.includes('⟦')) continue;
  if (store.get(u.src) !== undefined) continue;
  n++;
  console.log(`\n#### ${n}   (ctx ${u.ctx})`);
  console.log(`SRC: ${u.src}`);
  if (u.fragments.length) {
    console.log(`PLACEHOLDERS:`);
    u.fragments.forEach((f, i) => console.log(`   ⟦${i}⟧ = ${f.replace(/<[^>]*>/g, '')}   [${f.slice(0, 90)}]`));
  }
}
console.log(`\n(${n} composite units absent from TM)`);
