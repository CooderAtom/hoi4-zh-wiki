import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('cache/pages/Map.json', 'utf8'));
console.log('--- every src mentioning nogui in the scraped HTML ---');
for (const m of d.html.matchAll(/src="([^"]*nogui[^"]*)"/g)) console.log('  ' + m[1]);
console.log('--- images[] entries mentioning nogui ---');
for (const im of (d.images || [])) {
  const s = JSON.stringify(im);
  if (/nogui/.test(s)) console.log('  ' + s);
}
console.log('--- installed image names containing map (lower) ---');
for (const n of fs.readdirSync('site/images')) if (/states_map|diplomacy_map/i.test(n)) console.log('  ' + n);
