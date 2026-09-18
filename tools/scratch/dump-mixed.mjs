// Print the full, exact text of every mixed CJK+English node, ready to copy into a fix map.
import fs from 'node:fs';
import { parse } from '../dom.mjs';

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;
const mixed = (t) => {
  if (!CJK.test(t) || !LATIN.test(t)) return false;
  const w = t.match(/[A-Za-z][A-Za-z'’-]{2,}/g) || [];
  if (w.length < 3) return false;
  return ((t.replace(/[（(][^（()）]*[）)]/g, '').match(/[A-Za-z][A-Za-z'’-]{2,}/g) || []).length) >= 3;
};

for (const file of process.argv.slice(2)) {
  const h = fs.readFileSync(file, 'utf8');
  const s = h.indexOf('mw-parser-output');
  const root = parse(h.slice(h.lastIndexOf('<div', s), h.indexOf('</main>', s) > 0 ? h.indexOf('</main>', s) : undefined));
  console.log(`\n################ ${file}`);
  let n = 0;
  for (const e of root.descendants()) {
    for (const c of e.children || []) {
      if (c.type !== 3) continue;
      const t = c.data.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (!mixed(t)) continue;
      n++;
      console.log(`\n--- mixed #${n}  <${e.name}>  (raw length ${c.data.length}) ---`);
      console.log(JSON.stringify(t));
    }
  }
  console.log(`\n(${n} mixed nodes)`);
}
