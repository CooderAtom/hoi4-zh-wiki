// Find Latin text still visible in a built page, and report why it was not replaced.
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { Store, normalize } from '../translate.mjs';

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const art = html.match(/<article[\s\S]*?<\/article>/i);
const root = parse(art ? art[0] : html);

const store = new Store();
const hasLatin = (s) => /[A-Za-z\u00c0-\u024f]/.test(s);
const translatable = (s) => {
  const t = normalize(s);
  if (!t || !hasLatin(t)) return false;
  if (/^[\W\d_]+$/.test(t)) return false;
  if (/^[A-Za-z0-9_+\-./%×:()\[\]{}<>|&*#@$^~=`'"\s]{1,2}$/.test(t)) return false;
  return true;
};

// Build an ancestry string for reporting.
function pathOf(node) {
  const bits = [];
  let n = node.parent;
  while (n && n.type === 1 && bits.length < 6) {
    let s = n.name;
    const cls = n.attr && n.attr('class');
    if (cls) s += '.' + String(cls).split(/\s+/).slice(0, 2).join('.');
    bits.unshift(s);
    n = n.parent;
  }
  return bits.join(' > ');
}

let total = 0, chars = 0;
const buckets = new Map();
const samples = [];
for (const e of root.descendants()) {
  for (const c of e.children || []) {
    if (c.type !== 3) continue;
    if (!translatable(c.data)) continue;
    total++;
    const t = normalize(c.data);
    chars += t.length;
    const key = pathOf(c) || '(root)';
    buckets.set(key, (buckets.get(key) || 0) + 1);
    if (samples.length < 30) {
      const inStore = store.get(t) !== undefined || store.get(c.data) !== undefined;
      samples.push({ chars: t.length, inStore, path: key, text: t.slice(0, 110) });
    }
  }
}

console.log(`FILE ${file}`);
console.log(`English text nodes remaining: ${total}  (${chars} chars)`);
console.log('\n--- by ancestry (top 15) ---');
for (const [k, v] of [...buckets].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`${String(v).padStart(4)}  ${k}`);
console.log('\n--- samples (inStore=already in translation memory but NOT rendered) ---');
for (const s of samples) console.log(`${s.inStore ? 'IN-TM ' : '      '} ${String(s.chars).padStart(5)}c  ${s.path}\n         ${s.text}`);
