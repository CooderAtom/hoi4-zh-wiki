// Recompute a page's coverage the way 07-build.mjs does (applyTranslations ratio) and compare
// with the number currently burned into the HTML banner and footer.
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { applyTranslations } from '../units.mjs';
import { Store } from '../translate.mjs';

const store = new Store();
for (const name of process.argv.slice(2)) {
  const file = `site/${name}.html`;
  const html = fs.readFileSync(file, 'utf8');
  const s = html.indexOf('mw-parser-output');
  const root = parse(html.slice(html.lastIndexOf('<div', s), html.indexOf('</main>', s)));
  const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));
  const st = applyTranslations(body, store, {});
  const banner = html.match(/<div class="cov-banner">本页中文翻译进度 <b>(\d+)%<\/b>/);
  const footer = html.match(/中文翻译进度 (\d+)%/);
  console.log(`${name.padEnd(28)} pipeline=${(st.ratio * 100).toFixed(1)}%  banner=${banner ? banner[1] + '%' : '(none)'}  footer=${footer ? footer[1] + '%' : '?'}   nodes=${st.nodes} done=${st.done}`);
}
