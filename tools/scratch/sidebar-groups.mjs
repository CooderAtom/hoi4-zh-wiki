// Round 50: read the sidebar's own <h3> grouping, so we can see how the site categorises its
// entry points and whether the modding cluster is presented as first-class navigation.
import fs from 'node:fs';
import path from 'node:path';
const s = fs.readFileSync(path.join('site', process.argv[2] || 'Warfare.html'), 'utf8');
const i = s.indexOf('<h3>更多页面</h3>');
const start = s.lastIndexOf('<div class="sidebar', i) >= 0 ? s.lastIndexOf('<div class="sidebar', i) : 0;
const sidebarStart = s.indexOf('class="sidebar');
const chunk = s.slice(Math.max(0, sidebarStart - 40), sidebarStart + 12000);
// print h3 headers with the links immediately following each
const parts = chunk.split(/<h3>/);
parts.forEach((p, idx) => {
  const h = p.slice(0, p.indexOf('</h3>'));
  const links = [...p.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(
    (x) => x[2].replace(/<[^>]*>/g, '').trim() + ' -> ' + x[1]
  );
  if (idx === 0 && !h) return;
  console.log('\n### ' + h + '   (' + links.length + ')');
  for (const l of links) console.log('    ' + l);
});
