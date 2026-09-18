// Verify tag nesting: find the table that contains a given text and report its ancestor chain,
// plus detect any implicitly-closed / misnested table markup.
import fs from 'node:fs';
import { parse } from '../dom.mjs';

const [file, needle] = process.argv.slice(2);
const html = fs.readFileSync(file, 'utf8');
const start = html.indexOf('mw-parser-output');
const body = html.slice(start >= 0 ? html.lastIndexOf('<div', start) : 0);
const root = parse(body);

const find = (n, out = []) => {
  for (const c of n.children || []) {
    if (c.type === 1) { out.push(c); find(c, out); }
  }
  return out;
};
const els = find(root);

// depth of an element in the parsed tree
function depthOf(el) {
  let d = 0, n = el.parent;
  while (n) { d++; n = n.parent; }
  return d;
}

const hits = [];
for (const e of els) {
  for (const c of e.children || []) {
    if (c.type === 3 && c.data.trim() === needle) hits.push(e);
  }
}
console.log(`elements whose text is exactly "${needle}": ${hits.length}`);
for (const h of hits.slice(0, 3)) {
  const chain = [];
  let n = h;
  while (n && n.type === 1) {
    let s = n.name + (n.attr('class') ? '.' + String(n.attr('class')).split(/\s+/).join('.') : '');
    chain.unshift(s);
    n = n.parent;
  }
  console.log('\nchain:', chain.join(' > '));
  console.log('depth:', depthOf(h), '| children:', h.children.length);
}

// Nesting sanity: does any <table> appear as a direct child of <tr> or <tbody>?
let bad = 0;
for (const e of els) {
  if (e.name !== 'table') continue;
  const p = e.parent;
  if (p && p.type === 1 && (p.name === 'tr' || p.name === 'tbody' || p.name === 'thead')) {
    bad++;
    if (bad <= 5) console.log(`\nMISNESTED: <table> directly inside <${p.name}>  (depth ${depthOf(e)})`);
  }
}
console.log(`\n<table> directly inside <tr>/<tbody>: ${bad}`);
console.log(`total elements: ${els.length}, max depth: ${Math.max(...els.map(depthOf))}`);
