// Dump a pageblock's English items to cache/dump.md for review.
//   node tools/09d-dump.mjs Modifiers.s0520
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';

const base = process.argv[2];
if (!base) { console.error('usage: node tools/09d-dump.mjs <pageblock-basename>'); process.exit(1); }
const t = readJson(path.join(DATA, 'pageblocks', `${base}.json`));
if (!t) { console.error('not found:', base); process.exit(1); }
fs.writeFileSync('cache/dump.md', t.items.map((i) => '### ' + i.k + '\n' + i.en + '\n').join('\n'), 'utf8');
console.log(`cache/dump.md  items=${t.items.length} chars=${t.items.reduce((s, i) => s + i.en.length, 0)}`);
