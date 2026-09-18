// Write whole-unit (composite) translations into the TM, enforcing the project's #1 rule:
// the ⟦n⟧ placeholder sequence must be IDENTICAL to the English, not merely ascending.
// usage: node tools/scratch/tm-add-units.mjs data/work/units-Navy.json [...]
import fs from 'node:fs';
import { Store, normalize, key } from '../translate.mjs';

const store = new Store();
const seq = (s) => (String(s).match(/⟦\s*(\d+)\s*⟧/g) || []).map((x) => Number(x.replace(/[⟦⟧\s]/g, '')));

let added = 0, skipped = 0, failed = 0;
for (const f of process.argv.slice(2)) {
  const map = JSON.parse(fs.readFileSync(f, 'utf8'));
  let a = 0, s = 0, bad = 0;
  for (const [i, item] of (map.items || []).entries()) {
    const en = normalize(item.en);
    const zh = normalize(item.zh);
    if (!zh) { s++; continue; }
    const a1 = seq(en), a2 = seq(zh);
    if (a1.join(',') !== a2.join(',')) {
      console.log(`  ! TOKEN MISMATCH ${f} item[${i}]`);
      console.log(`      en(${a1.length}): ${a1.join(',')}`);
      console.log(`      zh(${a2.length}): ${a2.join(',')}`);
      const miss = a1.filter((x) => !a2.includes(x));
      const extra = a2.filter((x) => !a1.includes(x));
      if (miss.length) console.log(`      missing: ${miss.join(',')}`);
      if (extra.length) console.log(`      extra: ${extra.join(',')}`);
      bad++; failed++;
      continue;
    }
    if (store.set(en, zh)) { a++; added++; } else { s++; skipped++; }
  }
  console.log(`  ${f}: +${a} set, ${s} no-op, ${bad} rejected`);
}
const written = store.flush();
console.log(`\ntm entries now: ${store.size}  (flush wrote ${written} keys)`);
if (failed) { console.log(`\n${failed} ITEM(S) REJECTED — fix them and re-run.`); process.exit(1); }
