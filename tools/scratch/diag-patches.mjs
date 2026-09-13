import fs from 'node:fs';
import { Store, key } from '../translate.mjs';

const s = new Store();
s.load();
const en = 'Major patch (aka "Husky"). Released alongside La Résistance';
console.log('key=' + key(en));
console.log('in TM: ' + (s.get(en) !== undefined));
console.log('value: ' + JSON.stringify(s.get(en)));

const r = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8')).find(x => x.title === 'Patches');
console.log('Patches pct=' + (r.pct * 100).toFixed(3) + ' left=' +
  Math.round(r.proseChars - r.translatedChars) + ' of ' + r.proseChars);

const h = fs.readFileSync('site/Patches.html', 'utf8');
for (const t of ['重大补丁', '哈士奇', '抵抗运动', 'Released alongside', 'Major patch'])
  console.log('  html has ' + t + ': ' + h.includes(t));

// What does the export still consider pending for Patches?
