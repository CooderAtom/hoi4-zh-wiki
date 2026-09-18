// Final gate: for each page I edited, confirm structure vs backup, untranslated headings,
// broken links/images, and print a one-line verdict.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../dom.mjs';

const PAGES = [
  ['Naval_technology', 'cache/refsite/Naval_technology.prebak.html'],
  ['Naval_support_technology', 'cache/refsite/Naval_support_technology.prebak.html'],
  ['Navy', 'cache/refsite/Navy.prebak.html'],
  ['Naval_missions', 'cache/refsite/Naval_missions.prebak.html'],
  ['Paradox', 'cache/refsite/Paradox.prebak.html'],
  ['Land_doctrine', 'cache/refsite/Land_doctrine.prebak.html'],
];

const TAGS = ['table', 'thead', 'tbody', 'tr', 'td', 'th', 'p', 'ul', 'ol', 'li', 'div', 'span', 'b', 'i', 'a', 'img', 'h2', 'h3', 'h4', 'h5'];
const count = (h, t) => (h.match(new RegExp(`<${t}[\\s>]`, 'gi')) || []).length;
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

let failures = 0;
for (const [name, backup] of PAGES) {
  const file = `site/${name}.html`;
  const cur = fs.readFileSync(file, 'utf8');
  const bak = fs.existsSync(backup) ? fs.readFileSync(backup, 'utf8') : null;

  const structDiffs = bak ? TAGS.filter((t) => count(bak, t) !== count(cur, t)) : ['(no backup)'];

  // untranslated headings
  const s = cur.indexOf('mw-parser-output');
  const root = parse(cur.slice(cur.lastIndexOf('<div', s), cur.indexOf('</main>', s)));
  let badHeads = 0;
  for (const e of root.descendants()) {
    if (!/^h[1-6]$/.test(e.name)) continue;
    const txt = e.textContent.replace(/\s+/g, ' ').trim();
    if (txt && !CJK.test(txt)) badHeads++;
  }

  // broken links / images
  const dir = 'site';
  let bad = 0;
  for (const m of cur.matchAll(/href="([^"#][^"]*)"/g)) {
    const h = m[1];
    if (/^(https?:|mailto:|#)/.test(h)) continue;
    if (!fs.existsSync(path.join(dir, h.split('#')[0]))) bad++;
  }
  for (const m of cur.matchAll(/src="([^"]+)"/g)) {
    const sr = m[1];
    if (/^(https?:|data:)/.test(sr)) continue;
    if (!fs.existsSync(path.join(dir, sr))) bad++;
  }

  const ok = structDiffs.length === 0 && badHeads === 0 && bad === 0;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(28)} structure:${structDiffs.length ? structDiffs.join(',') : 'identical'}  untranslated-headings:${badHeads}  broken-refs:${bad}`);
}
console.log(failures ? `\n${failures} PAGE(S) FAILED` : '\nALL EDITED PAGES PASS');
process.exit(failures ? 1 : 0);
