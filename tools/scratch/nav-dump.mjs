// Round 50: dump the shared navigation (the element that appears on every page) so we can see
// exactly which entry points the site offers a reader, including any off-topic ones.
import fs from 'node:fs';
import path from 'node:path';
const f = process.argv[2] || 'Warfare.html';
const s = fs.readFileSync(path.join('site', f), 'utf8');
// find the nav-ish container
for (const cls of ['sidebar', 'nav', 'menu', 'dsh-nav', 'topnav', 'site-nav']) {
  const re = new RegExp('<[^>]*class="[^"]*' + cls + '[^"]*"[^>]*>', 'g');
  const m = re.exec(s);
  if (!m) continue;
  const start = m.index;
  const chunk = s.slice(start, start + 4000);
  const links = [...chunk.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map((x) => x[1] + '  |  ' + x[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
  console.log('--- container class~"' + cls + '" (' + links.length + ' links) ---');
  for (const l of links.slice(0, 40)) console.log('   ' + l);
  console.log('');
}
