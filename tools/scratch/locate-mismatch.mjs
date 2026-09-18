// Locate every exact-text hub mismatch with file + line number, so each can be judged.
import fs from 'node:fs';

const EXPECT = { '海军': 'Navy.html', '陆军': 'Land_warfare.html', '空军': 'Air_warfare.html' };

for (const f of fs.readdirSync('site').filter((x) => x.endsWith('.html'))) {
  const lines = fs.readFileSync('site/' + f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
      const href = m[1], label = m[2].trim();
      const want = EXPECT[label];
      if (!want || href.startsWith('http') || href.startsWith('#') || href === want) continue;
      console.log(`${f}:${i + 1}  ${label} -> ${href}`);
    }
  });
}
