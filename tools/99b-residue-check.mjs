// Audit the built site for leftover wiki artifacts and external references.
import fs from 'node:fs';

const files = fs.readdirSync('site').filter((x) => x.endsWith('.html'));
let mathErr = 0, ext = 0, extCss = 0;
const extSample = [];
for (const f of files) {
  const h = fs.readFileSync('site/' + f, 'utf8');
  mathErr += (h.match(/Failed to parse|Math extension cannot connect/g) || []).length;
  for (const m of h.matchAll(/(?:src|href)="(https?:)?\/\/([^"/]+)/g)) {
    if (/^(127\.0\.0\.1|localhost)$/.test(m[2])) continue;
    ext++;
    if (extSample.length < 8) extSample.push(f + ' -> ' + m[0]);
  }
  extCss += (h.match(/@import\s+url\(\s*['"]?https?:/g) || []).length;
}
// The only expected external reference is the per-page CC BY-SA attribution link to the source wiki.
const nonAttribution = extSample.filter((s) => !s.includes('href="https://hoi4.paradoxwikis.com'));
console.log('html files:', files.length);
console.log('raw math-error strings:', mathErr);
console.log('external src/href refs:', ext);
for (const s of extSample) console.log('   sample: ' + s);
console.log('external @import in html:', extCss);
if (nonAttribution.length) console.log('UNEXPECTED external refs found:', nonAttribution.length);

const css = fs.readdirSync('site/assets').filter((x) => x.endsWith('.css'));
let cssExt = 0;
for (const f of css) {
  const t = fs.readFileSync('site/assets/' + f, 'utf8');
  cssExt += (t.match(/url\(\s*['"]?(https?:)?\/\//g) || []).length;
  cssExt += (t.match(/@import\s+(url\()?['"]?https?:/g) || []).length;
}
console.log('css files:', css.length, 'external urls in css:', cssExt);
