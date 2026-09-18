// Can each unresolved anchor be scoped to the section that contains the link?
// Not every unresolved anchor is a lost id: table-cell links (e.g. a tech table's prerequisite
// "#Early_Destroyer") have no target in our HTML at all, but the CELL sits under a real heading.
// Rewriting such a link to that heading is not exact, so this only REPORTS feasibility.
import fs from 'node:fs';
import { parse } from '../dom.mjs';

const files = process.argv.slice(2);
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const s = html.indexOf('mw-parser-output');
  const root = parse(html.slice(html.lastIndexOf('<div', s), html.indexOf('</main>', s)));
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  // collect heading id + its position, then for each anchor link find the nearest heading before it
  const heads = [];
  const links = [];
  (function walk(n) {
    for (const c of n.children) {
      if (c.type !== 1) continue;
      if (/^h[1-6]$/.test(c.name)) heads.push({ id: c.attr('id'), node: c });
      if (c.name === 'a') {
        const href = c.attr('href') || '';
        if (href.startsWith('#') && !ids.has(href.slice(1))) links.push({ href, node: c });
      }
      walk(c);
    }
  })(root);

  const ancestorsOf = (node) => { const out = []; let n = node.parent; while (n) { out.push(n); n = n.parent; } return out; };
  let scopeable = 0;
  for (const l of links) {
    const anc = new Set(ancestorsOf(l.node));
    const enclosing = heads.filter((h) => anc.has(h.node)).pop()
      || heads.filter((h) => { const a = new Set(ancestorsOf(h.node)); return a.has(l.node.parent); }).pop();
    if (enclosing && enclosing.id) scopeable++;
  }
  console.log(`${f}: unresolved=${links.length}  under a real heading (scopeable to section)=${scopeable}  truly orphan=${links.length - scopeable}`);
}
