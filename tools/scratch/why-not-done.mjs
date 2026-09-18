// Which nodes does applyTranslations count as NOT done? Report what they contain AFTER
// translation, so we can tell a real gap from a stale-watcher counting artifact.
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { translatable } from '../units.mjs';
import { Store, normalize } from '../translate.mjs';

const store = new Store();
const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const s = html.indexOf('mw-parser-output');
const root = parse(html.slice(html.lastIndexOf('<div', s), html.indexOf('</main>', s)));
const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));

// Reproduce the denominator exactly as applyTranslations does.
const watched = [];
for (const e of body.descendants()) {
  for (const c of e.children || []) {
    if (c.type === 3 && translatable(c.data)) watched.push(c);
  }
}
console.log(`denominator (watched text nodes): ${watched.length}`);

// import the renderer and let it mark __done
const { applyTranslations } = await import('../units.mjs');
const st = applyTranslations(body, store, {});
console.log(`done=${st.done} ratio=${(st.ratio * 100).toFixed(1)}%`);

const notDone = watched.filter((c) => !c.__done);
console.log(`\nwatched nodes NOT marked done: ${notDone.length}`);
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
let cjk = 0, eng = 0;
for (const c of notDone) {
  const t = normalize(c.data);
  if (CJK.test(t)) cjk++; else eng++;
}
console.log(`   of those, text is now CHINESE (counting artifact): ${cjk}`);
console.log(`   of those, text is still ENGLISH  (real gap)       : ${eng}`);
console.log('\nsamples of each:');
let shown = 0;
for (const c of notDone) {
  const t = normalize(c.data);
  if (!CJK.test(t) && shown++ < 15) console.log(`   [EN] ${JSON.stringify(t.slice(0, 100))}`);
}
