// Exact-text audit: <a href="X">LABEL</a> where LABEL is exactly a hub label and X is a
// DIFFERENT page (not an in-page anchor, not an external URL).
import fs from 'node:fs';
import path from 'node:path';

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
  '作战计划': 'Battle_plan.html',
};

const rows = [];
for (const f of fs.readdirSync('site').filter((x) => x.endsWith('.html'))) {
  const html = fs.readFileSync(path.join('site', f), 'utf8');
  // exact link: text is exactly the label, no nested tags
  for (const m of html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
    const href = m[1], label = m[2].trim();
    const want = EXPECT[label];
    if (!want) continue;
    if (href.startsWith('http') || href.startsWith('#')) continue;
    if (href === want) continue;
    rows.push({ f, label, href, want });
  }
}
const byPair = new Map();
for (const r of rows) byPair.set(`${r.label}  ->  ${r.href}   (应指向 ${r.want})`, (byPair.get(`${r.label}  ->  ${r.href}   (应指向 ${r.want})`) || 0) + 1);
console.log('exact-label links pointing at the wrong page:');
for (const [k, n] of [...byPair].sort((a, b) => b[1] - a[1])) console.log(`  x${String(n).padStart(4)}  ${k}`);
console.log(`\ntotal: ${rows.length}   files: ${[...new Set(rows.map((r) => r.f))].length}`);
const perFile = new Map();
for (const r of rows) perFile.set(r.f, (perFile.get(r.f) || 0) + 1);
console.log('\nfiles:');
for (const [f, n] of [...perFile].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(3)}  ${f}`);
