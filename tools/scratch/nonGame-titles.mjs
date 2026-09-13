// Round 50: list every page title that could plausibly be non-game content, so the
// "not part of this game" criterion is checked against the FULL inventory rather than
// a handful of guessed patterns.
import fs from 'node:fs';
const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));
const titles = rows.map((r) => r.title).sort();
console.log('total titles: ' + titles.length);

const SUSPECT = /(soundtrack|music|song|album|merch|book|novel|film|movie|television|tv series|board game|tabletop|card game|comic|wiki|paradox|forum|steam|mod|community|staff|developer|podcast|youtube|twitch|esport|award)/i;
const hits = titles.filter((t) => SUSPECT.test(t));
console.log('\ntitles matching non-game keywords (' + hits.length + '):');
for (const t of hits) console.log('  - ' + t);

console.log('\n--- manual scan: all titles NOT starting with a mechanics/country-looking word ---');
const MECH = /^(A|An|The)?\s*(Achievement|Air|Armor|Army|Artillery|Attack|Autonomy|Balance|Battle|Beginner|Casualties|Cavalry|Combat|Command|Console|Construction|Convoy|Country|Countries|Decision|Defines|Diplomacy|Division|Dockyard|Effect|Equipment|Events|Experience|Faction|Fuel|Garrison|Government|Hearts|Hotkey|Ideas|Ideology|Infantry|Intelligence|Jargon|Land|Lend|Logistics|Manpower|Marine|Mechanics|Military|Modifier|Modding|Mods|Mountain|Nation|National|Naval|Navy|Occupation|Officer|On|Operation|Paradox|Patch|Peace|Political|Production|Province|Puppet|Recruit|Releasable|Research|Resistance|Resources|Ship|Special|State|Strategic|Sub|Support|Tank|Technology|Terrain|Trade|Training|Triggers|Tutorial|Unit|User|War|Warfare|Weather|World|Achievements|Ancient|Formable|List|Downloadable|Developer)/i;
const odd = titles.filter((t) => !MECH.test(t));
console.log('  count: ' + odd.length + ' (mostly country names)');
for (const t of odd) console.log('  * ' + t);
