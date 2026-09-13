// Round 50: dump ALL navigation-like link groups from a page, plus the footer, so we can see
// every entry point offered on a normal content page.
import fs from 'node:fs';
import path from 'node:path';
const f = process.argv[2] || 'Warfare.html';
const s = fs.readFileSync(path.join('site', f), 'utf8');
// Split into <nav>/<aside>/<footer>/<header> blocks by tag
const tags = ['nav', 'aside', 'footer', 'header'];
for (const t of tags) {
  const re = new RegExp('<' + t + '\\b[\\s\\S]*?<\\/' + t + '>', 'g');
  const all = s.match(re) || [];
  all.forEach((blk, i) => {
    const links = [...blk.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(
      (x) => x[1] + '  |  ' + x[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    );
    console.log('--- <' + t + '> #' + i + '  (' + links.length + ' links) ---');
    for (const l of links) console.log('   ' + l);
    console.log('');
  });
}
// Where does Modding.html actually appear?
console.log('=== occurrences of Modding.html / Developer_diaries.html ===');
for (const needle of ['Modding.html', 'Developer_diaries.html', 'Mods.html', 'Paradox.html']) {
  let i = -1, n = 0;
  while ((i = s.indexOf(needle, i + 1)) >= 0) {
    n++;
    if (n <= 3) console.log('  ' + needle + ' @' + i + ':  ...' + s.slice(Math.max(0, i - 150), i + 60).replace(/\s+/g, ' ') + '...');
  }
  console.log('  ' + needle + ' total: ' + n);
}
