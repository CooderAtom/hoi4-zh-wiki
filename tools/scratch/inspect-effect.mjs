// For the 5-column tech table, list the widest leaf cells inside the 效果 column, so we can see
// what forces the nested table wider than the column.
import fs from 'node:fs';
import { parse } from '../dom.mjs';

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const s = html.indexOf('mw-parser-output');
const root = parse(html.slice(html.lastIndexOf('<div', s), html.indexOf('</main>', s) > 0 ? html.indexOf('</main>', s) : undefined));

// find the first table whose first data row has 5 cells
let target = null;
for (const t of root.descendants()) {
  if (t.name !== 'table') continue;
  const body = t.children.find((c) => c.name === 'tbody') || t;
  const rows = body.children.filter((c) => c.name === 'tr');
  if (rows.length > 1 && rows[1].children.filter((c) => c.name === 'td').length === 5) { target = t; break; }
}
if (!target) { console.log('target table not found'); process.exit(1); }

const body = target.children.find((c) => c.name === 'tbody') || target;
const rows = body.children.filter((c) => c.name === 'tr');
const row = rows[1];
const tds = row.children.filter((c) => c.name === 'td');
const eff = tds[4];

const text = (n) => n.textContent.replace(/\s+/g, ' ').trim();
const widths = [];
(function walk(n, depth) {
  for (const c of n.children) {
    if (c.type !== 1) continue;
    const tx = text(c);
    if (tx && !c.children.some((x) => x.type === 1 && text(x))) {
      widths.push({ depth, tag: c.name, len: tx.length, t: tx.slice(0, 60) });
    }
    walk(c, depth + 1);
  }
})(eff, 0);

console.log(`effect column leaf text nodes: ${widths.length}`);
widths.sort((a, b) => b.len - a.len);
console.log('\nlongest leaf texts (by character count):');
for (const w of widths.slice(0, 20)) console.log(`  ${String(w.len).padStart(4)}c  ${w.tag}  ${w.t}`);

// inline widths inside the effect column
const inlineW = [];
(function walk(n) {
  for (const c of n.children) {
    if (c.type !== 1) continue;
    const st = c.attr('style') || '';
    if (/width/i.test(st)) inlineW.push(`${c.name} style="${st.slice(0, 70)}"`);
    walk(c);
  }
})(eff, 0);
console.log('\nelements inside 效果 with an inline width:');
for (const w of inlineW.slice(0, 15)) console.log('  ' + w);

// images inside effect column
const imgs = [];
(function walk(n) { for (const c of n.children) { if (c.type !== 1) continue; if (c.name === 'img') imgs.push(c.attr('src') || ''); walk(c); } })(eff, 0);
console.log(`\nimages in 效果: ${imgs.length}`);
for (const i of imgs.slice(0, 10)) console.log('  ' + i);
