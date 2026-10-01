// Debug helper: show why a unit fails to align against a built page.
//   node tools/scratch/align-debug.mjs <key> [pageSlug]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, SITE, readJson } from '../lib.mjs';

const key = process.argv[2];
const slugName = process.argv[3] || 'Military_industrial_organization';
const units = readJson(path.join(DATA, 'units.json'), []);
const u = units.find((x) => x.k === key);
if (!u) { console.error('no unit', key); process.exit(1); }
const html = fs.readFileSync(path.join(SITE, slugName + '.html'), 'utf8');

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');
const isWs = (c) => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';

const parts = u.en.split(/\u27E6\d+\u27E7/).map(escHtml);
console.log('key:', key, '| ctx:', u.ctx, '| frags:', u.frags, '| parts:', parts.length);
console.log('en:', JSON.stringify(u.en.slice(0, 200)));

function indexOfWs(src, lit, from) {
  if (lit === '') return { start: from, end: from };
  const toks = lit.split(/\s+/);
  let idx = src.indexOf(toks[0], from);
  while (idx >= 0) {
    let cur = idx + toks[0].length;
    let ok = true;
    for (let t = 1; t < toks.length; t++) {
      let j = cur;
      while (j < src.length && isWs(src[j])) j++;
      if (src.startsWith(toks[t], j)) cur = j + toks[t].length;
      else { ok = false; break; }
    }
    if (ok) return { start: idx, end: cur };
    idx = src.indexOf(toks[0], idx + 1);
  }
  return null;
}

let cur = 0;
for (let i = 0; i < parts.length; i++) {
  const p = parts[i];
  const m = p === '' ? { start: cur, end: cur } : indexOfWs(html, p, cur);
  if (!m) {
    console.log(`\nFAIL at literal #${i}: ${JSON.stringify(p.slice(0, 120))}`);
    console.log('source around cursor (' + Math.max(0, cur - 200) + '):');
    console.log(JSON.stringify(html.slice(Math.max(0, cur - 200), cur + 400)));
    break;
  }
  console.log(`#${i} len=${p.length} found@${m.start} :: ${JSON.stringify(p.slice(0, 60))}`);
  cur = m.end;
}
