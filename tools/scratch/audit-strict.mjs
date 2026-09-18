// Strict audit: match only an <a> whose ENTIRE content is the label (no nested tags, no
// attribute juggling), and report file + line. Avoids the false positives from [^>]* merging
// adjacent <li> items.
import fs from 'node:fs';

const EXPECT = { '海军': 'Navy.html', '陆军': 'Land_warfare.html', '空军': 'Air_warfare.html' };
const RE = /<a href="([^"]+)">([^<>]+)<\/a>/g;

const rows = [];
for (const f of fs.readdirSync('site').filter((x) => x.endsWith('.html'))) {
  const lines = fs.readFileSync('site/' + f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(RE)) {
      const href = m[1], label = m[2].trim();
      const want = EXPECT[label];
      if (!want || href.startsWith('http') || href.startsWith('#') || href === want) continue;
      rows.push({ f, line: i + 1, label, href });
    }
  });
}

// Also: which pages contain the "军种" hub box / grid (to identify the user's screenshot page)
console.log('=== strict mismatches ===');
for (const r of rows) console.log(`${r.f}:${r.line}  ${r.label} -> ${r.href}`);
console.log(`total: ${rows.length}`);

console.log('\n=== pages rendering a 军种 hub box or grid ===');
for (const f of fs.readdirSync('site').filter((x) => x.endsWith('.html'))) {
  const h = fs.readFileSync('site/' + f, 'utf8');
  const hubBox = /id="military"/.test(h);
  const grid = /class="hub-grid"/.test(h);
  const h2 = /<h2[^>]*>军种<\/h2>|<h3[^>]*>军种<\/h3>/.test(h);
  if (hubBox || grid || h2) console.log(`  ${f}  hub-box=${hubBox} grid=${grid} heading=${h2}`);
}
