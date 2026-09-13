// Literal string replacement inside a pageblocks .zh.json, with JSON validation before and after.
//   node tools/scratch/replace-in-block.mjs <file.zh.json> <oldText> <newText>
import fs from 'node:fs';
import path from 'node:path';
const file = path.join('data/pageblocks', path.basename(process.argv[2]));
const [oldT, newT] = process.argv.slice(3);
const before = fs.readFileSync(file, 'utf8');
const parse = (s, label) => { try { return JSON.parse(s); } catch (e) { console.log(label + ' PARSE FAIL: ' + e.message); process.exit(1); } };
const b0 = parse(before, 'before');
const n = before.split(oldT).length - 1;
if (!n) { console.log('no occurrence of ' + JSON.stringify(oldT)); process.exit(0); }
const after = before.split(oldT).join(newT);
parse(after, 'after');
fs.writeFileSync(file, after);
console.log(file + ': replaced ' + n + ' occurrences; items=' + b0.items.length + ' (unchanged)');
