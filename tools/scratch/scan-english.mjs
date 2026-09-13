// Scan the BUILT site for English prose that is still visible to a reader.
//
// Deliberate English is excluded by construction:
//   - content inside <code>/<pre>/<script>/<style>
//   - content inside Chinese OR ASCII parentheses  (...)/(...)  -> e.g. 霍尔蒂与哈布斯堡王子（Miklos Horthy and the Habsburg Prince）
//   - runs shorter than --min words (product names, tags, identifiers)
// What is left is text the extractor never turned into a translatable unit, i.e. the pipeline's blind spot.
//
//   node tools/scratch/scan-english.mjs [--min 5] [--top 40] [--page Slug] [--json out.json]
import fs from 'node:fs';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const min = Number(arg('min', 5));
const top = Number(arg('top', 40));
const only = arg('page', null);
const jsonOut = arg('json', null);

const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", mdash: '—', ndash: '–', hellip: '…' };
const unent = (s) => s.replace(/&(#?\w+);/g, (m, k) => (ENT[k] !== undefined ? ENT[k] : m));

function visibleChunks(html) {
  let b = html;
  const m = b.match(/<div id="mw-content-text"[\s\S]*/);
  if (m) b = m[0];
  b = b
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<code[\s\S]*?<\/code>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<span class="mw-editsection"[\s\S]*?<\/span>/gi, ' ')
    .replace(/<[^>]+>/g, '\u0001')
    .replace(/&#?\w+;/g, (x) => unent(x));
  // remove parenthesised content (both widths) - that is where deliberate English lives
  b = b.replace(/（[^（）]*）/g, ' ').replace(/\([^()]*\)/g, ' ');
  return b.split(/\u0001+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

const files = only ? [only + '.html'] : fs.readdirSync('site').filter((f) => f.endsWith('.html'));
const rows = [];
for (const f of files) {
  const html = fs.readFileSync('site/' + f, 'utf8');
  const chunks = visibleChunks(html);
  const hits = [];
  for (const c of chunks) {
    const words = c.match(/[A-Za-z][A-Za-z'’\-]*/g) || [];
    if (words.length < min) continue;
    const letters = (c.match(/[A-Za-z]/g) || []).length;
    const nonspace = c.replace(/\s/g, '').length;
    if (!nonspace || letters / nonspace < 0.6) continue;
    hits.push(c);
  }
  if (!hits.length) continue;
  const chars = hits.reduce((s, h) => s + h.length, 0);
  rows.push({ slug: f.replace(/\.html$/, ''), n: hits.length, chars, hits });
}
rows.sort((a, b) => b.chars - a.chars);
const T = rows.reduce((s, r) => s + r.chars, 0);
const N = rows.reduce((s, r) => s + r.n, 0);
console.log('pages scanned=' + files.length + '  pages with visible english=' + rows.length + '  runs=' + N + '  chars=' + T);
console.log('');
for (const r of rows.slice(0, top)) {
  console.log(String(r.chars).padStart(7) + '  x' + String(r.n).padStart(4) + '  ' + r.slug);
}
if (only && rows[0]) {
  console.log('');
  console.log('--- hits in ' + only + ' ---');
  for (const h of rows[0].hits) console.log('  | ' + h.slice(0, 300));
}
if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1)); console.log('\nwrote ' + jsonOut); }
