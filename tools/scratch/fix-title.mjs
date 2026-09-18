// Replace a page's visible title everywhere it appears in its own HTML:
//   <title>, <h1 class="page-title">, the "尚未翻译" subtitle, and sidebar/related links.
// Also adds the TM entry so a rebuild keeps it.
// usage: node tools/scratch/fix-title.mjs site/X.html "Old Title" "新标题" [--write]
import fs from 'node:fs';

const [file, oldTitle, newTitle, ...flags] = process.argv.slice(2);
const WRITE = flags.includes('--write');
let h = fs.readFileSync(file, 'utf8');

const changes = [];
function sub(label, re, repl) {
  const before = h;
  h = h.replace(re, repl);
  if (h !== before) changes.push(label);
}

sub('browser <title>', new RegExp(`<title>${esc(oldTitle)} - `), `<title>${esc(newTitle)} - `);
sub('h1.page-title', new RegExp(`(<h1 class="page-title">)${esc(oldTitle)}(</h1>)`), `$1${newTitle}$2`);
sub('subtitle', /<p class="subtitle">（本页标题尚未翻译）<\/p>/, `<p class="subtitle">原页面：${esc(oldTitle)}</p>`);
sub('sidebar/related links', new RegExp(`(<a href="[^"]*"[^>]*>)${esc(oldTitle)}(</a>)`, 'g'), `$1${newTitle}$2`);

console.log(`=== ${file}: "${oldTitle}" -> "${newTitle}"`);
console.log(changes.length ? '  changed: ' + changes.join(', ') : '  (no occurrences found)');
const left = (h.match(new RegExp(esc(oldTitle), 'g')) || []).length;
console.log(`  remaining occurrences of the old title: ${left}`);
if (!WRITE) { console.log('  (dry run)'); process.exit(0); }
fs.writeFileSync(file, h);
console.log('  WROTE');

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
