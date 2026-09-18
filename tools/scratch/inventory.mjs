// Inventory of untranslated text on the four pages, grouped by element kind.
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { normalize } from '../translate.mjs';

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const un = (s) => {
  const t = normalize(s);
  if (t.length < 2 || !LATIN.test(t) || CJK.test(t)) return false;
  if (/^\s*[\W\d_]+\s*$/.test(t)) return false;
  return true;
};

const FILES = process.argv.slice(2);
for (const f of FILES) {
  const html = fs.readFileSync(f, 'utf8');
  const s = html.indexOf('mw-parser-output');
  const body = html.slice(html.lastIndexOf('<div', s), html.indexOf('</main>', s));
  const root = parse(body);
  const byKind = new Map();
  for (const e of root.descendants()) {
    for (const c of e.children || []) {
      if (c.type !== 3 || !un(c.data)) continue;
      const t = normalize(c.data);
      // classify by nearest block ancestor
      let kind = 'text', n = e;
      while (n) {
        if (n.type === 1) {
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(n.name)) { kind = n.name + ':heading'; break; }
          if (n.name === 'th') { kind = 'th:table-header'; break; }
          if (n.name === 'td') { kind = 'td:table-cell'; break; }
          if (n.name === 'li') { kind = 'li:list'; break; }
          if (n.name === 'p') { kind = 'p:paragraph'; break; }
          if (n.name === 'div') { kind = 'div'; break; }
          if (n.name === 'b' || n.name === 'strong') { kind = 'b:bold'; break; }
          if (n.name === 'a') { kind = 'a:link'; break; }
        }
        n = n.parent;
      }
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind).push(t);
    }
  }
  const total = [...byKind.values()].reduce((a, b) => a + b.length, 0);
  const chars = [...byKind.values()].reduce((a, b) => a + b.reduce((x, y) => x + y.length, 0), 0);
  console.log(`\n########## ${f}: ${total} untranslated nodes / ${chars} chars`);
  for (const [k, arr] of [...byKind].sort((a, b) => b[1].length - a[1].length)) {
    const uniq = [...new Set(arr)];
    console.log(`\n  --- ${k}: ${arr.length} nodes, ${uniq.length} unique ---`);
    for (const u of uniq.slice(0, 25)) console.log(`      ${u.slice(0, 130)}`);
    if (uniq.length > 25) console.log(`      ... (${uniq.length - 25} more)`);
  }
}
