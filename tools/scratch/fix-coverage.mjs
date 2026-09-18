// Refresh the stale coverage number in a page's banner and footer.
// The build computes coverage from the ENGLISH source; these pages were patched in place, so
// their banner still shows the pre-fix number (Navy said 45% while the page is actually ~93%).
// usage: node tools/scratch/fix-coverage.mjs site/Navy.html 93 [--write]
import fs from 'node:fs';

const [file, pctArg, ...flags] = process.argv.slice(2);
const WRITE = flags.includes('--write');
const pct = Number(pctArg);
if (!Number.isFinite(pct) || pct < 0 || pct > 100) { console.error('bad pct'); process.exit(2); }

let h = fs.readFileSync(file, 'utf8');
const before = h;
const changes = [];

const bannerRe = /(<div class="cov-banner">本页中文翻译进度 <b>)(\d+)(%<\/b>，未译部分暂保留英文原文。<\/div>)/;
if (bannerRe.test(h)) {
  const old = h.match(bannerRe)[2];
  if (Number(old) !== pct) { h = h.replace(bannerRe, `$1${pct}$3`); changes.push(`banner ${old}% -> ${pct}%`); }
} else if (pct >= 99.5) {
  changes.push('banner: none (correct — page is complete)');
}

const footRe = /(中文翻译进度 )(\d+)(%)/;
const fm = h.match(footRe);
if (fm) {
  if (Number(fm[2]) !== pct) { h = h.replace(footRe, `$1${pct}$3`); changes.push(`footer ${fm[2]}% -> ${pct}%`); }
} else changes.push('footer: not found');

console.log(`${file}  target=${pct}%`);
console.log(changes.length ? '  ' + changes.join('\n  ') : '  (already correct)');
if (!WRITE) { console.log('  (dry run)'); process.exit(0); }
if (h !== before) fs.writeFileSync(file, h);
console.log('  WROTE');
