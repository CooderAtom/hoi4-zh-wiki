import fs from 'node:fs';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const names = ['Nuke events', 'News events 1', 'German events', 'Political events',
  'Ace pilots events', 'Generic events AAT', 'Occupation events', 'Low Stability events'];

// Does the page-units file even exist for these?
const unitsPath = 'data/page-units.json';
const units = fs.existsSync(unitsPath) ? JSON.parse(fs.readFileSync(unitsPath, 'utf8')) : null;
console.log('page-units.json exists: ' + !!units);
if (units) {
  const keys = Object.keys(units);
  console.log('page-units pages: ' + keys.length);
  for (const n of names) console.log('  ' + n + ' -> ' + (units[n] ? 'present' : 'ABSENT'));
}
for (const n of names) {
  const r = rows.find(x => x.title === n);
  console.log(n.padEnd(24) + ' pct=' + (r ? (r.pct * 100).toFixed(2) + '% left=' + Math.round(r.proseChars - r.translatedChars) + '/' + r.proseChars : 'MISSING'));
}
const pending = fs.readdirSync('data/pageblocks').filter(f => f.endsWith('.pr0000.json'));
console.log('\npending files: ' + pending.length + '\n  ' + pending.join('\n  '));
