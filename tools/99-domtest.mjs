// Parser sanity check against real wiki HTML.
import fs from 'node:fs';
import path from 'node:path';
import { parse, serialize, $, $1, queryAll } from './dom.mjs';
import { api, CACHE } from './lib.mjs';

const pages = process.argv.slice(2);
const list = pages.length ? pages : ['Government', 'Warfare', 'Division', 'Land units'];
for (const t of list) {
  const d = await api({ action: 'parse', page: t, prop: 'text|images', format: 'json', formatversion: '2' });
  const html = d.parse.text;
  const t0 = Date.now();
  const root = parse(html);
  const ptime = Date.now() - t0;
  const out = serialize(root);
  const els = root.descendants().length;
  const mp = $1(root, '.mw-parser-output');
  console.log(`\n=== ${t} ===`);
  console.log(`  html=${html.length}B out=${out.length}B elements=${els} parse=${ptime}ms`);
  console.log(`  tables=${$(root, 'table').length} imgs=${$(root, 'img').length} figures=${$(root, 'figure').length} h2=${$(root, 'h2').length}`);
  console.log(`  parser-output=${!!mp} children=${mp ? mp.children.length : 0}`);
  console.log(`  round-trip stable=${serialize(parse(out)) === out}`);
  // detect catastrophic nesting: deepest element depth
  let maxDepth = 0;
  const walk = (n, d) => { maxDepth = Math.max(maxDepth, d); for (const c of n.children) if (c.isElement) walk(c, d + 1); };
  walk(root, 0);
  console.log(`  max depth=${maxDepth}`);
  if (pages.length <= 2) {
    console.log('  sample text:', root.textContent.replace(/\s+/g, ' ').trim().slice(0, 300));
  }
}
