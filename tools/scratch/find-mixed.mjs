// Find "mixed" text nodes: a text node that contains BOTH Chinese and English prose.
// These are invisible to the un() filter used elsewhere (which rejects anything containing CJK),
// so an English sentence that wraps an already-Chinese link is never reported as untranslated.
//
// Heuristic: the node has a CJK char AND a run of >=3 consecutive ASCII letters forming a real
// word (not a leftover acronym inside parentheses). Nodes whose English is only inside
// parentheses after Chinese (the project's deliberate bilingual style) are excluded.
import fs from 'node:fs';
import path from 'node:path';

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const files = process.argv.slice(2);
const list = files.length ? files : fs.readdirSync('site').filter((f) => f.endsWith('.html')).map((f) => path.join('site', f));

// English word run of >= 3 chars, and >= 3 such words (i.e. real English prose, not a stray term)
function englishProse(t) {
  const words = t.match(/[A-Za-z][A-Za-z'’-]{2,}/g) || [];
  return words.length >= 3 ? words : null;
}

let total = 0;
const rows = [];
for (const f of list) {
  const h = fs.readFileSync(f, 'utf8');
  const s = h.indexOf('mw-parser-output');
  if (s < 0) continue;
  const body = h.slice(h.lastIndexOf('<div', s), h.indexOf('</main>', s) > 0 ? h.indexOf('</main>', s) : undefined);
  const re = />([^<>]+)</g;
  let m;
  const hits = [];
  while ((m = re.exec(body))) {
    const raw = m[1];
    const t = raw.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t || !CJK.test(t)) continue;
    const words = englishProse(t);
    if (!words) continue;
    // exclude the deliberate "中文（English）" style: English only inside parentheses
    const stripped = t.replace(/[（(][^（()）]*[）)]/g, '');
    if (!englishProse(stripped)) continue;
    hits.push({ t, words: words.length });
  }
  if (hits.length) { total += hits.length; rows.push({ f, hits }); }
}
rows.sort((a, b) => b.hits.length - a.hits.length);
console.log(`mixed CJK+English prose nodes found: ${total} across ${rows.length} pages`);
for (const r of rows.slice(0, 30)) {
  console.log(`\n##### ${r.f}  (${r.hits.length})`);
  for (const h of r.hits.slice(0, 6)) console.log(`   [${h.words}w] ${h.t.slice(0, 200)}`);
}
fs.writeFileSync('data/work/mixed-nodes.json', JSON.stringify(rows, null, 1));
console.log('\nfull list -> data/work/mixed-nodes.json');
