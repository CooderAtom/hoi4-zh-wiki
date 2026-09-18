// Structural comparison: published reference site vs. current local build.
import fs from 'node:fs';
import path from 'node:path';

const TAGS = ['table', 'thead', 'tbody', 'tr', 'td', 'th', 'p', 'ul', 'ol', 'li', 'div', 'span', 'b', 'i', 'a'];

function counts(html) {
  const c = {};
  for (const t of TAGS) {
    c[t] = (html.match(new RegExp(`<${t}[\\s>]`, 'gi')) || []).length;
  }
  // body only, to skip shell/sidebar noise
  const m = html.match(/<article[\s\S]*?<\/article>/i) || html.match(/<main[\s\S]*?<\/main>/i);
  c.__articleFound = m ? 1 : 0;
  c.__bodyLen = html.length;
  return c;
}

function articleOf(html) {
  const m = html.match(/<article[\s\S]*?<\/article>/i);
  return m ? m[0] : html;
}

const PAGES = process.argv.slice(2);
for (const p of PAGES) {
  const refPath = path.join('cache', 'refsite', p + '.html');
  const locPath = path.join('site', p + '.html');
  if (!fs.existsSync(refPath)) { console.log(`\n=== ${p}: NO REF`); continue; }
  const ref = articleOf(fs.readFileSync(refPath, 'utf8'));
  const loc = articleOf(fs.readFileSync(locPath, 'utf8'));
  const a = counts(ref), b = counts(loc);
  console.log(`\n=== ${p}  (article: ref ${ref.length} / local ${loc.length})`);
  const rows = [];
  for (const t of TAGS) {
    const d = b[t] - a[t];
    if (d !== 0) rows.push(`${t}: ${a[t]} -> ${b[t]}  (${d > 0 ? '+' : ''}${d})`);
  }
  console.log(rows.length ? rows.join('\n') : '  structural counts IDENTICAL');
}
