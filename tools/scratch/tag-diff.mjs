// Show where one file has <p>/<a> tags the other lacks (structure diff drill-down).
import fs from 'node:fs';

const [fileA, fileB] = process.argv.slice(2);
const a = fs.readFileSync(fileA, 'utf8');
const b = fs.readFileSync(fileB, 'utf8');

function tags(h, name) {
  const out = [];
  const re = new RegExp(`<${name}[\\s>][^>]*>`, 'gi');
  let m;
  while ((m = re.exec(h))) out.push({ at: m.index, tag: m[0] });
  return out;
}

for (const name of ['p', 'a']) {
  const ta = tags(a, name), tb = tags(b, name);
  console.log(`\n=== <${name}> : A=${ta.length}  B=${tb.length}`);
  // find tags in B whose exact text is missing from A
  const setA = new Map();
  for (const t of ta) setA.set(t.tag, (setA.get(t.tag) || 0) + 1);
  const extra = [];
  for (const t of tb) {
    const c = setA.get(t.tag) || 0;
    if (c > 0) setA.set(t.tag, c - 1);
    else extra.push(t);
  }
  console.log(`  tags present in B but not A: ${extra.length}`);
  for (const t of extra.slice(0, 8)) {
    console.log(`   @${t.at} ${JSON.stringify(t.tag)}`);
    console.log(`      context: ${JSON.stringify(b.slice(Math.max(0, t.at - 160), t.at + 200))}`);
  }
}
