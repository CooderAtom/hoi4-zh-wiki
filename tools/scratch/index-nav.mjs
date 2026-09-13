// Round 50: show what the site's own navigation points at, to confirm the off-topic pruning
// actually happened at the entry-point level (not just in the file listing).
import fs from 'node:fs';
const idx = fs.readFileSync('site/index.html', 'utf8');
const links = [...idx.matchAll(/<a\b[^>]*href="([^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({
  h: m[1],
  t: m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
}));
console.log('index.html links to ' + links.length + ' pages');
for (const l of links) console.log('   ' + l.h.padEnd(44) + ' | ' + l.t.slice(0, 52));
