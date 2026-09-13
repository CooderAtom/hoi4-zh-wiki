// Site-wide visible-English census on the BUILT pages.
// Strips scripts/styles/pre/code (structural residue is expected to stay English), then measures
// runs of Latin text in the rendered page. This is the direct measure of "does the site still show
// English prose to a reader".
//   node tools/scratch/visible-english.mjs [--top 25] [--min 25]
import fs from 'node:fs';
import path from 'node:path';

const argN = (n, d) => { const i = process.argv.indexOf(n); return i === -1 ? d : Number(process.argv[i + 1]); };
const top = argN('--top', 25);
const minRun = argN('--min', 25);

// The wiki renders one shared achievement-tooltip block on every page. It is the same 451 chars
// everywhere and is by design (achievement names render as 中文（English）), so measure it once and
// subtract it rather than letting 660 copies dominate the total.
const onlyArg = (() => { const i = process.argv.indexOf('--file'); return i === -1 ? null : process.argv[i + 1]; })();
const files = fs.readdirSync('site').filter((f) => f.endsWith('.html')
  && (!onlyArg || f === onlyArg || f === onlyArg + '.html'));
const seenBlock = new Map();

function runsOf(file) {
  let h = fs.readFileSync(path.join('site', file), 'utf8');
  h = h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  h = h.replace(/<pre[\s\S]*?<\/pre>/gi, ' ').replace(/<code[\s\S]*?<\/code>/gi, ' ');
  const text = h.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  return (text.match(/[A-Za-z][A-Za-z0-9 ,.'’()\-/:%]{3,}/g) || [])
    .map((r) => r.trim()).filter((r) => r.length >= minRun);
}

const rows = [];
for (const f of files) {
  let rs;
  try { rs = runsOf(f); } catch { continue; }
  for (const r of rs) seenBlock.set(r, (seenBlock.get(r) || 0) + 1);
  rows.push({ f, chars: rs.reduce((s, r) => s + r.length, 0), n: rs.length, runs: rs });
}

// runs appearing on >=100 pages are shared boilerplate, not per-page prose
const shared = new Set([...seenBlock.entries()].filter(([, c]) => c >= 100).map(([r]) => r));
let total = 0, sharedTotal = 0;
for (const r of rows) {
  r.own = r.runs.filter((x) => !shared.has(x));
  r.ownChars = r.own.reduce((s, x) => s + x.length, 0);
  total += r.ownChars;
  sharedTotal += r.chars - r.ownChars;
}
rows.sort((a, b) => b.ownChars - a.ownChars);
console.log('pages=' + rows.length + '  shared boilerplate runs=' + shared.size + ' (' + sharedTotal + ' chars total across site)');
console.log('PER-PAGE visible english chars (shared boilerplate excluded) = ' + total);
console.log('');
for (const r of rows.slice(0, top)) {
  console.log('  ' + String(r.ownChars).padStart(7) + '  x' + String(r.own.length).padStart(4) + '  ' + r.f);
}
console.log('');
console.log('--- sample runs from the worst 5 pages ---');
for (const r of rows.slice(0, 5)) {
  console.log('### ' + r.f + '  (' + r.ownChars + ' chars)');
  for (const x of r.own.sort((a, b) => b.length - a.length).slice(0, 8)) console.log('   [' + x.length + '] ' + x.slice(0, 120));
}
