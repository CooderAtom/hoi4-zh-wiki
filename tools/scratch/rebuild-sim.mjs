// Definitive test: take the ENGLISH source page, collect its units, apply the CURRENT store,
// and report — for the sentences the gap tool flagged — whether the unit is in the TM and
// whether the renderer actually applied it.
import fs from 'node:fs';
import { parse, serialize } from '../dom.mjs';
import { collectUnits, applyTranslations } from '../units.mjs';
import { Store, normalize, key } from '../translate.mjs';

const file = process.argv[2];
const before = fs.readFileSync(file, 'utf8');
const s = before.indexOf('mw-parser-output');
const root = parse(before.slice(before.lastIndexOf('<div', s), before.indexOf('</main>', s)));
const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));

const store = new Store();
const units = collectUnits(body);
const composite = units.filter((u) => u.src.includes('⟦'));
console.log(`units: ${units.length}  with placeholders (composite/leaf): ${composite.length}`);

let inTm = 0, notInTm = 0, applied = 0, notApplied = 0;
const missing = [];
for (const u of composite) {
  const has = store.get(u.src) !== undefined;
  if (has) inTm++; else { notInTm++; if (missing.length < 12) missing.push(u.src); }
}
console.log(`composite units present in TM : ${inTm}`);
console.log(`composite units ABSENT  in TM : ${notInTm}`);
console.log('\nexamples still absent from the TM:');
for (const m of missing) console.log('  - ' + m.slice(0, 130));

// Now actually render the whole English page with the current store and count leftovers.
const st = applyTranslations(body, store, {});
const out = serialize(body);
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const norm = (t) => String(t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const un = (t) => t.length >= 2 && LATIN.test(t) && !CJK.test(t) && !/^\s*[\W\d_]+\s*$/.test(t);
const mixed = (t) => {
  if (!CJK.test(t) || !LATIN.test(t)) return false;
  const w = t.match(/[A-Za-z][A-Za-z'’-]{2,}/g) || [];
  if (w.length < 3) return false;
  return ((t.replace(/[（(][^（()）]*[）)]/g, '').match(/[A-Za-z][A-Za-z'’-]{2,}/g) || []).length) >= 3;
};
const root3 = parse(out);
let pure = 0, mix = 0;
for (const e of root3.descendants()) for (const c of e.children || []) {
  if (c.type !== 3) continue;
  const t = norm(c.data);
  if (un(t)) pure++;
  else if (mixed(t)) mix++;
}
console.log(`\nrendering the ENGLISH source with the current TM =>`);
console.log(`   stats: ${JSON.stringify({ blocks: st.blocks, texts: st.texts, inlines: st.inlines })}`);
console.log(`   leftover pure-English text nodes: ${pure}`);
console.log(`   leftover MIXED nodes            : ${mix}`);
