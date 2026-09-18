// Sync each table-of-contents label with the Chinese text of the heading it points to.
//
// The TOC is generated at build time from the ORIGINAL DOM, so when a heading is translated by
// patching the page in place, the TOC keeps the English label — the TOC then contradicts the
// heading right below it. Anchor ids are NOT translated, so only the label text is rewritten;
// every href stays byte-identical.
// usage: node tools/scratch/sync-toc.mjs site/Navy.html [--write]
import fs from 'node:fs';

const [file, ...flags] = process.argv.slice(2);
const WRITE = flags.includes('--write');
let html = fs.readFileSync(file, 'utf8');

const tocMatch = html.match(/<nav class="toc"[\s\S]*?<\/nav>/);
if (!tocMatch) { console.log(`${file}: no TOC`); process.exit(0); }
let toc = tocMatch[0];

// Anchor id -> Chinese heading text. The TOC href points at the HEADING element's id
// (e.g. #s-1u04j8f), while the mw-headline span carries the English slug id (id="Destroyers"),
// so the mapping must key on the heading's id and read the text from the inner span.
const headings = new Map();
for (const m of html.matchAll(/<h[1-6][^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h[1-6]>/g)) {
  const text = m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (text) headings.set(m[1], text);
}

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const changes = [];
const newToc = toc.replace(/<a href="#([^"]+)">([^<]*)<\/a>/g, (all, id, label) => {
  const zh = headings.get(id);
  if (!zh || CJK.test(label) || label === zh) return all;
  changes.push(`"${label}" -> "${zh}"`);
  return `<a href="#${id}">${zh}</a>`;
});

console.log(`${file}: ${changes.length} TOC label(s) to sync`);
for (const c of changes) console.log('   ' + c);
if (!WRITE) { console.log('  (dry run)'); process.exit(0); }
if (!changes.length) { console.log('  nothing to do'); process.exit(0); }
html = html.replace(toc, newToc);
fs.writeFileSync(file, html);
console.log('  WROTE');
