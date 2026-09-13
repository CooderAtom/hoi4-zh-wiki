// Find untranslated English prose that is STILL VISIBLE in a built page.
// Strips tags, then reports runs of >=N consecutive ASCII words (i.e. English sentences),
// with the surrounding Chinese context so you can see where the gap sits.
//   node tools/scratch/find-english.mjs <Page_slug> [minWords] [maxHits]
import fs from 'node:fs';
const slug = process.argv[2];
const minWords = Number(process.argv[3] || 6);
const maxHits = Number(process.argv[4] || 40);
const html = fs.readFileSync('site/' + slug + '.html', 'utf8');

// Keep only the article body if we can find it, else the whole document.
let body = html;
const m = html.match(/<div id="mw-content-text"[\s\S]*?<\/div>\s*<\/div>/);
if (m) body = m[0];

const text = body
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, '\u0001')          // tag boundary marker
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const flat = text.replace(/\u0001+/g, '\u0001');
const chunks = flat.split('\u0001');
const hits = [];
for (let i = 0; i < chunks.length; i++) {
  const c = chunks[i].replace(/\s+/g, ' ').trim();
  if (!c) continue;
  const words = c.match(/[A-Za-z][A-Za-z'’\-]*/g) || [];
  if (words.length < minWords) continue;
  // ratio of ascii letters to total non-space chars; English prose is dominated by them
  const letters = (c.match(/[A-Za-z]/g) || []).length;
  const nonspace = c.replace(/\s/g, '').length;
  if (!nonspace || letters / nonspace < 0.55) continue;
  const before = (chunks[i - 1] || '').replace(/\s+/g, ' ').trim().slice(-70);
  const after = (chunks[i + 1] || '').replace(/\s+/g, ' ').trim().slice(0, 70);
  hits.push({ i, c, before, after, words: words.length });
}

console.log('file=' + slug + '.html   english-prose runs=' + hits.length + ' (showing ' + Math.min(maxHits, hits.length) + ')');
for (const h of hits.slice(0, maxHits)) {
  console.log('');
  console.log('  [chunk ' + h.i + ', ' + h.words + ' words]');
  if (h.before) console.log('    ...ZH> ' + h.before);
  console.log('    EN> ' + h.c.slice(0, 400));
  if (h.after) console.log('    ZH>... ' + h.after);
}
