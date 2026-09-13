// Compare the href forms for a substring between the raw source and the built page.
import fs from 'node:fs';
const slug = process.argv[2] || 'List_of_political_advisors';
const frag = process.argv[3] || 'Ideology';
const b = fs.readFileSync('site/' + slug + '.html', 'utf8');
const s = fs.readFileSync('cache/pages/' + slug + '.json', 'utf8');
const tally = (html) => {
  const m = new Map();
  const re = new RegExp('href="([^"]*' + frag + '[^"]*)"', 'g');
  let x;
  while ((x = re.exec(html))) m.set(x[1], (m.get(x[1]) || 0) + 1);
  return m;
};
for (const [label, html] of [['BUILT', b], ['RAW SOURCE', s]]) {
  const m = tally(html);
  console.log(label + ' — distinct hrefs containing "' + frag + '": ' + m.size);
  for (const [k, n] of [...m.entries()].sort((p, q) => q[1] - p[1]).slice(0, 8)) console.log('   ' + String(n).padStart(5) + '  ' + k);
}
