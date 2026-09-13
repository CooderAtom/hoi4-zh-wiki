import fs from 'node:fs';
import { Store } from '../translate.mjs';

const s = new Store();
const fixes = [
  ['Major patch (aka "Husky"). Released alongside La Résistance',
   '大型补丁（又名 "Husky"）。随 抵抗运动 一同发布'],
  ['Major patch. Released alongside Götterdämmerung',
   '大型补丁。随 诸神黄昏 一同发布'],
];
for (const [en, zh] of fixes) {
  const before = s.get(en);
  const changed = s.set(en, zh);
  console.log((changed ? 'UPDATED ' : 'NOCHANGE ') + JSON.stringify(en));
  console.log('   before: ' + JSON.stringify(before));
  console.log('   after:  ' + JSON.stringify(s.get(en)));
}
const n = s.flush();
console.log('flushed entries: ' + n);
