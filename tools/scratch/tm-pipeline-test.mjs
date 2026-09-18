// Does a TM entry actually get APPLIED by the pipeline for each node shape I patched?
// Runs the real collectUnits + applyTranslations on synthetic snippets, so I know whether a
// future rebuild (which needs cache/pages, absent here) would keep my fixes.
import { parse, serialize } from '../dom.mjs';
import { collectUnits, applyTranslations } from '../units.mjs';
import { Store, normalize } from '../translate.mjs';

const store = new Store();

const CASES = [
  ['h2 heading', '<div class="mw-parser-output"><h2 id="s-1"><span class="mw-headline" id="Destroyers">Destroyers</span></h2></div>', 'Destroyers'],
  ['table cell value', '<div class="mw-parser-output"><table><tbody><tr><td>165 days</td></tr></tbody></table></div>', '165 days'],
  ['bold label', '<div class="mw-parser-output"><table><tbody><tr><td><b>HP：</b></td></tr></tbody></table></div>', 'HP：'],
  ['nested cell text', '<div class="mw-parser-output"><table><tbody><tr><td><table><tbody><tr><td>Unlocks</td></tr></tbody></table></td></tr></tbody></table></div>', 'Unlocks'],
  ['span distance', '<div class="mw-parser-output"><table><tbody><tr><td><span style="float:right;">1500 km</span></td></tr></tbody></table></div>', '1500 km'],
  ['link label', '<div class="mw-parser-output"><p>see <a href="x.html">Hydrophones</a> here</p></div>', 'Hydrophones'],
  ['list item country', '<div class="mw-parser-output"><ul><li><img src="i.png">&nbsp;Sardinia-Piedmont</li></ul></div>', 'Sardinia-Piedmont'],
  ['text with NBSP', '<div class="mw-parser-output"><p>\u00a0Sardinia-Piedmont</p></div>', 'Sardinia-Piedmont'],
];

let pass = 0, fail = 0;
for (const [name, html, en] of CASES) {
  const root = parse(html);
  const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));
  const units = collectUnits(body);
  const collected = units.some((u) => normalize(u.src) === normalize(en));
  applyTranslations(body, store, {});          // the real renderer pass
  const out = serialize(body);
  // Only visible TEXT counts. The English often survives legitimately in id="..." / href="..."
  // (e.g. <span id="Destroyers">), so strip tags before looking for untranslated English.
  const visible = out.replace(/<[^>]*>/g, '\u0001');
  const applied = !visible.includes(en);
  const expect = store.get(en);
  const ok = collected && applied;
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  console.log(`      TM "${en}" -> ${JSON.stringify(expect)}`);
  console.log(`      collected-as-unit=${collected}  applied-in-output=${applied}`);
  if (!ok) console.log(`      output: ${out.slice(0, 220)}`);
}
console.log(`\n${pass} passed, ${fail} failed`);

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
