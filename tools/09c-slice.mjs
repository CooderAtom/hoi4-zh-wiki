// Slice one chunk out of an existing page template without regenerating every chunk file.
//   node tools/09c-slice.mjs "<template basename>" <from> <count>
// e.g. node tools/09c-slice.mjs Modifiers 0 130
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';

const base = process.argv[2];
const from = Number(process.argv[3] || 0);
const count = Number(process.argv[4] || 130);
if (!base) { console.error('usage: node tools/09c-slice.mjs <base> <from> <count>'); process.exit(1); }

const tpl = readJson(path.join(DATA, 'pageblocks', `${base}.template.json`));
if (!tpl) { console.error('template not found:', base); process.exit(1); }
const items = tpl.items.slice(from, from + count);
const file = `${base}.s${String(from).padStart(4, '0')}.json`;
writeJson(path.join(DATA, 'pageblocks', file), { page: tpl.page, from, items });
console.log(`${file}: items=${items.length} chars=${items.reduce((s, u) => s + u.en.length, 0)} total=${tpl.items.length}`);
