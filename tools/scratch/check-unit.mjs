// Is a given still-visible English string present in the extracted unit set?
import fs from 'node:fs';
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const needles = [
  ['Modding', 'Version keeping via Github'],
  ['Modding', 'These are the most common text editors'],
  ['Modding', 'to avoid losing everything. Consider using a source control'],
  ['Faction', 'Nations with the generic focus tree'],
  ['Faction', 'upon the start of a civil war'],
  ['Beginners', 'The Launcher for Hoi4'],
  ['Beginners', 'Clear user directory button'],
  ['Beginners', 'Video display button - Clicking the gear icon'],
];
for (const [pg, n] of needles) {
  const hits = units.filter((u) => u.en && u.en.includes(n));
  console.log(pg + ' :: "' + n.slice(0, 46) + '" -> ' + (hits.length ? 'FOUND ctx=' + hits[0].ctx + ' frags=' + hits[0].frags + ' len=' + hits[0].len : 'NOT A UNIT'));
}
