// Find every "label -> wrong target" mismatch of the 海军 kind: a link whose visible text is a
// Chinese hub label but whose target is the wrong page per the registry's HUBS definition.
import fs from 'node:fs';
import path from 'node:path';

// label -> the page the label should open (from HUBS / common sense)
const EXPECT = {
  '海军': 'Navy.html',
  '陆军': 'Land_warfare.html',
  '空军': 'Air_warfare.html',
  '海军学说': 'Naval_doctrine.html',
  '陆军学说': 'Land_doctrine.html',
  '空军学说': 'Air_doctrine.html',
  '海军科技': 'Naval_technology.html',
  '空军科技': 'Air_technology.html',
  '海军任务': 'Naval_missions.html',
  '海军单位': 'Ship.html',
};

const rows = [];
for (const f of fs.readdirSync('site').filter((x) => x.endsWith('.html'))) {
  const html = fs.readFileSync(path.join('site', f), 'utf8');
  for (const m of html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
    const href = m[1], label = m[2].trim();
    const want = EXPECT[label];
    if (!want || href.startsWith('http') || href === want) continue;
    rows.push({ f, label, href, want });
  }
}
const byPair = new Map();
for (const r of rows) {
  const k = `${r.label} -> ${r.href} (should be ${r.want})`;
  byPair.set(k, (byPair.get(k) || 0) + 1);
}
console.log('mismatched label/target pairs:');
for (const [k, n] of [...byPair].sort((a, b) => b[1] - a[1])) console.log(`  x${String(n).padStart(4)}  ${k}`);
console.log(`\ntotal mismatched links: ${rows.length}`);
const files = [...new Set(rows.map((r) => r.f))];
console.log(`files affected: ${files.length}`);
console.log(files.slice(0, 12).join('\n'));
