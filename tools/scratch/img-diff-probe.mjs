// Find the exact difference between the two image checkers.
import fs from 'node:fs';
import path from 'node:path';
const SITE = 'site';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

for (const probe of ['Nuclear_Reactor.png', 'Rocket_engines.png', 'Time_is_on_Our_Side.jpg']) {
  console.log(`\n=== ${probe}`);
  // Where does it actually live in the tree?
  const found = [];
  (function walk(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else if (e.name === probe) found.push(`images/${r}`);
    }
  })(path.join(SITE, 'images'), '');
  console.log(`  real path(s): ${found.length ? found.join(', ') : '(none)'}`);
  // Every literal src in HTML that decodes to this basename
  const lits = new Set();
  for (const f of fs.readdirSync(SITE).filter((x) => x.endsWith('.html'))) {
    const s = fs.readFileSync(path.join(SITE, f), 'utf8');
    for (const m of s.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)) {
      if (decode(m[1]).endsWith('/' + probe) || decode(m[1]) === probe) lits.add(m[1]);
    }
  }
  console.log(`  literal src values: ${[...lits].map((x) => JSON.stringify(x)).join(', ') || '(none)'}`);
  for (const l of lits) console.log(`     decoded=${JSON.stringify(decode(l))}  exists=${fs.existsSync(path.join(SITE, decode(l)))}`);
}
