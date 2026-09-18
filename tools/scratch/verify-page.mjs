// Verify a patched page: nothing but intended text changed.
// Checks: (1) tag counts vs a backup, (2) untranslated node count, (3) internal link and image
// reference counts, (4) every href/src still resolves on disk.
// usage: node tools/scratch/verify-page.mjs site/Naval_technology.html cache/refsite/Naval_technology.prebak.html
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../dom.mjs';

const [nowFile, beforeFile] = process.argv.slice(2);
const now = fs.readFileSync(nowFile, 'utf8');
const before = beforeFile && fs.existsSync(beforeFile) ? fs.readFileSync(beforeFile, 'utf8') : null;

const TAGS = ['table', 'thead', 'tbody', 'tr', 'td', 'th', 'p', 'ul', 'ol', 'li', 'div', 'span', 'b', 'i', 'a', 'img', 'h2', 'h3', 'h4'];
const count = (h, t) => (h.match(new RegExp(`<${t}[\\s>]`, 'gi')) || []).length;

console.log(`##### ${nowFile}`);
if (before) {
  const diffs = [];
  for (const t of TAGS) { const a = count(before, t), b = count(now, t); if (a !== b) diffs.push(`${t}: ${a} -> ${b} (${b - a > 0 ? '+' : ''}${b - a})`); }
  console.log(diffs.length ? 'STRUCTURE DIFFS:\n  ' + diffs.join('\n  ') : 'STRUCTURE: all tag counts identical to backup  ✓');
} else {
  console.log('(no backup given; structure not compared)');
}

// untranslated text
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const norm = (t) => String(t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const un = (t) => t.length >= 2 && LATIN.test(t) && !CJK.test(t) && !/^\s*[\W\d_]+\s*$/.test(t);
const s = now.indexOf('mw-parser-output');
const root = parse(now.slice(now.lastIndexOf('<div', s)));
const left = [];
for (const e of root.descendants()) for (const c of e.children || []) if (c.type === 3 && un(norm(c.data))) left.push(norm(c.data));
console.log(`untranslated English text nodes: ${left.length}`);
for (const t of [...new Set(left)]) console.log(`   ${JSON.stringify(t.slice(0, 90))}`);

// links + images resolve
const hrefs = [...now.matchAll(/href="([^"#][^"]*)"/g)].map((m) => m[1]);
const srcs = [...now.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
const siteDir = path.dirname(nowFile);
let badHref = 0, badSrc = 0;
const badList = [];
for (const h of hrefs) {
  if (/^(https?:|mailto:|#)/.test(h)) continue;
  const f = path.join(siteDir, h.split('#')[0]);
  if (!fs.existsSync(f)) { badHref++; badList.push('href ' + h); }
}
for (const sr of srcs) {
  if (/^(https?:|data:)/.test(sr)) continue;
  const f = path.join(siteDir, sr);
  if (!fs.existsSync(f)) { badSrc++; badList.push('src ' + sr); }
}
console.log(`links: ${hrefs.length} (broken ${badHref})   images: ${srcs.length} (broken ${badSrc})`);
for (const b of badList.slice(0, 10)) console.log('   BROKEN ' + b);
