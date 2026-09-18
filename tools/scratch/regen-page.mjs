// Regenerate a built page by running the REAL pipeline over its English backup.
//
// Why this is the right artifact: a full rebuild (tools/07-build.mjs) takes the sanitized English
// article and runs applyTranslations() over it. The pre-patch backup is exactly such a sanitized
// English article (localized paths, stripped external links), so running applyTranslations() on it
// reproduces what a rebuild would emit — including whole-sentence (composite) units, which a
// hand patch cannot express. Only the mw-parser-output section is rewritten; the shell
// (sidebar/toc/footer) is preserved byte-for-byte from the current page.
//
// usage: node tools/scratch/regen-page.mjs cache/refsite/Navy.prebak.html site/Navy.html [--write]
import fs from 'node:fs';
import { parse, serialize } from '../dom.mjs';
import { applyTranslations } from '../units.mjs';
import { Store } from '../translate.mjs';

const [backupFile, targetFile, ...flags] = process.argv.slice(2);
const WRITE = flags.includes('--write');
const store = new Store();

const bak = fs.readFileSync(backupFile, 'utf8');
const bs = bak.indexOf('mw-parser-output');
const bOpen = bak.lastIndexOf('<div', bs);
const bTail = bak.slice(bOpen);

const cur = fs.readFileSync(targetFile, 'utf8');
const cs = cur.indexOf('mw-parser-output');
const cOpen = cur.lastIndexOf('<div', cs);
// Keep everything after the article. Use the LAST "</main>": the first occurrence can sit in a
// comment near the top of the document, and slicing there duplicated the toc+article+footer
// (which showed up as +2 <p> in the structural check — a bug in THIS tool, not in the pipeline).
const cAfter = cur.lastIndexOf('</main>', cs);
const curAfter = cur.slice(cAfter >= 0 ? cAfter : cur.length);

const root = parse(bTail);
const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));
const stats = applyTranslations(body, store, {});
const rendered = serialize(root);

const out = cur.slice(0, cOpen) + rendered + curAfter;

console.log(`=== ${targetFile}  <- pipeline over ${backupFile}`);
console.log(`  stats: blocks=${stats.blocks} texts=${stats.texts} inlines=${stats.inlines} ratio=${(stats.ratio * 100).toFixed(1)}%`);
console.log(`  size: ${cur.length} -> ${out.length}`);

const outIdx = flags.indexOf('--out');
const outPath = outIdx >= 0 ? flags[outIdx + 1] : null;
if (outPath) { fs.mkdirSync(outPath.replace(/[\\/][^\\/]*$/, ''), { recursive: true }); }
// The regen file must live next to the site assets for relative links to resolve, so when the
// caller asks for a scratch copy we write it INTO site/ under a temp name.
const finalOut = outPath ? outPath : targetFile;
if (!WRITE && !outPath) { console.log('  (dry run — pass --write, or --out <file> to inspect)'); process.exit(0); }
fs.writeFileSync(finalOut, out);
console.log('  WROTE ' + finalOut);
