// Direct A/B of the two image-reference regexes over the same HTML, to settle 23 vs 2.
import fs from 'node:fs';
import path from 'node:path';
const SITE = 'site';
const html = fs.readFileSync(path.join(SITE, "Beginner's_guide.html"), 'utf8');

const reA = /<img[^>]*\ssrc="(images\/[^"]+)"/g;   // used by img-refs.mjs / img-refs-strict.mjs
const reB = /<img[^>]+src="[^"]*?images\/([^"]+)"/g; // used by missing-image-audit.mjs

for (const [name, re] of [['A', reA], ['B', reB]]) {
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  console.log(`regex ${name}: ${out.length} matches; contains Nuclear_Reactor.png: ${out.some((x) => /Nuclear_Reactor\.png/.test(x))}`);
}

// Show the surrounding markup of the Nuclear_Reactor reference.
const at = html.indexOf('Nuclear_Reactor.png');
console.log('\nmarkup around first Nuclear_Reactor.png reference:');
console.log('  ' + JSON.stringify(html.slice(Math.max(0, at - 160), at + 24)));
const at2 = html.indexOf('Nuclear_reactor.png');
console.log('  first Nuclear_reactor.png at index: ' + at2 + '  (nuclear lowercase)');
