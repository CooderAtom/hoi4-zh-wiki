// Round 50: classify the banned-pattern hits by their ACTUAL link target, so a legitimate
// in-wiki article ("Central America" region) is not confused with an off-topic entry point.
import fs from 'node:fs';
import path from 'node:path';
const SITE = 'site';
const probes = process.argv.slice(2);
for (const p of probes) {
  console.log('\n=== "' + p + '" : actual surrounding link targets ===');
  const seen = new Map();
  for (const f of fs.readdirSync(SITE).filter((x) => x.endsWith('.html'))) {
    const s = fs.readFileSync(path.join(SITE, f), 'utf8');
    for (const m of s.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]{0,80}?)<\/a>/g)) {
      const href = m[1];
      const label = m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (label.includes(p) || href.includes(p)) {
        const key = href + ' || ' + label;
        if (!seen.has(key)) seen.set(key, f);
      }
    }
  }
  let n = 0;
  for (const [k, src] of seen) {
    n++;
    if (n <= 12) console.log('  [' + src + ']  ' + k);
  }
  console.log('  distinct targets: ' + seen.size);
}
