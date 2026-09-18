// True coverage for an English-source page, measured exactly like 07-build.mjs:
// build the DOM, run applyTranslations with the current store, read stats.ratio.
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { applyTranslations } from '../units.mjs';
import { Store } from '../translate.mjs';

const store = new Store();
for (const f of process.argv.slice(2)) {
  const html = fs.readFileSync(f, 'utf8');
  const s = html.indexOf('mw-parser-output');
  const root = parse(html.slice(html.lastIndexOf('<div', s), html.indexOf('</main>', s)));
  const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));
  const st = applyTranslations(body, store, {});
  const pct = st.ratio * 100;
  // what would the banner/footer say?
  const banner = pct < 99.5 ? `本页中文翻译进度 ${Math.round(pct)}%` : '(no banner — page is >=99.5%)';
  console.log(`${f.replace(/^cache.refsite./, '').replace('.prebak.html', '').padEnd(28)} ratio=${pct.toFixed(1)}%  nodes=${st.nodes} done=${st.done} blocks=${st.blocks} inlines=${st.inlines}  -> ${banner}`);
}
