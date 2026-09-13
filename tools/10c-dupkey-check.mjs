// Check a block for duplicate source keys and for keys whose English appears more than once
// across the whole units table (which would make one Chinese translation ambiguous).
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';

const f = process.argv[2];
const b = readJson(path.join(DATA, 'pageblocks', f));
const units = readJson(path.join(DATA, 'units.json'), []);
const enCount = new Map();
for (const u of units) enCount.set(u.en, (enCount.get(u.en) || 0) + 1);

const seen = new Map();
let dupKey = 0, dupEn = 0;
for (const it of b.items) {
  if (seen.has(it.k)) { dupKey++; console.log('  duplicate key in block: ' + it.k + ' (previous zh: ' + seen.get(it.k) + ')  now: ' + it.zh); }
  seen.set(it.k, it.zh);
  const en = it.en || units.find((u) => u.k === it.k)?.en;
  if (en && enCount.get(en) > 1 && /[\u4e00-\u9fff]/.test(it.zh) && it.zh !== en) {
    // only flag when the Chinese actually differs from another translation of the same English
    dupEn++;
    console.log('  shared English (' + enCount.get(en) + ' units): ' + it.k + ' -> ' + it.zh.slice(0, 50));
  }
}
console.log(`${f}: items=${b.items.length} dupKeys=${dupKey} sharedEnglish=${dupEn}`);
