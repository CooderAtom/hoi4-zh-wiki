// Which untranslated titles are actually reachable pages (exist as built HTML + in the registry)?
import fs from 'node:fs';
import path from 'node:path';
import { Store } from '../translate.mjs';
import { readJson, DATA, SITE } from '../lib.mjs';

const store = new Store();
const manifest = readJson(path.join(DATA, 'pages.json'), { pages: [] });
const fetched = readJson(path.join(DATA, 'fetched.json'), { pages: {} });

const untitled = manifest.pages.filter((p) => store.get(p.title) === undefined);
const withPage = untitled.filter((p) => fs.existsSync(path.join(SITE, p.slug + '.html')));
const built = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));

console.log(`manifest pages: ${manifest.pages.length}`);
console.log(`untranslated titles: ${untitled.length}`);
console.log(`  of those, a built HTML file EXISTS: ${withPage.length}`);
console.log(`total built html: ${built.length}`);

// How many built pages render an untranslated <h1 class="page-title">?
let h1English = 0;
const list = [];
for (const f of built) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  const m = html.match(/<h1 class="page-title">([\s\S]*?)<\/h1>/);
  if (!m) continue;
  const t = m[1].trim();
  if (!/[\u3400-\u4dbf\u4e00-\u9fff]/.test(t)) { h1English++; list.push(f + '  ::  ' + t); }
}
console.log(`\nbuilt pages whose visible <h1> title has NO Chinese: ${h1English}`);
console.log(list.slice(0, 100).join('\n'));
