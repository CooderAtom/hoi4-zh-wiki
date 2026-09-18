// Does parse+serialize round-trip the article byte-for-byte? If yes, in-place HTML
// patching is safe (only the text nodes we touch will differ).
import fs from 'node:fs';
import { parse, serialize } from '../dom.mjs';

for (const f of process.argv.slice(2)) {
  const html = fs.readFileSync(f, 'utf8');
  const s = html.indexOf('mw-parser-output');
  const open = html.lastIndexOf('<div', s);
  const chunk = html.slice(open);
  const root = parse(chunk);
  const out = serialize(root);
  const eq = out.length === chunk.length && out === chunk;
  console.log(`\n${f}`);
  console.log(`  original slice: ${chunk.length} bytes`);
  console.log(`  re-serialized : ${out.length} bytes`);
  console.log(`  BYTE-IDENTICAL: ${eq ? 'YES' : 'NO'}`);
  if (!eq) {
    let i = 0;
    while (i < Math.min(out.length, chunk.length) && out[i] === chunk[i]) i++;
    console.log(`  first difference at ${i}:`);
    console.log(`    orig: ${JSON.stringify(chunk.slice(Math.max(0, i - 60), i + 80))}`);
    console.log(`    new : ${JSON.stringify(out.slice(Math.max(0, i - 60), i + 80))}`);
    let diffs = 0;
    for (let p = 0; p < Math.min(out.length, chunk.length); p++) if (out[p] !== chunk[p]) diffs++;
    console.log(`  differing byte positions: ${diffs}`);
  }
}
