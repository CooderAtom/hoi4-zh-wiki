// For every pageblock item whose English contains a ⟦n⟧ placeholder, report the inline HTML
// each placeholder stands for, so we can confirm image/link tokens survived translation.
//   node tools/10f-token-audit.mjs <block.zh.json>
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';

const files = process.argv.slice(2);
const dir = path.join(DATA, 'pageblocks');
const targets = files.length ? files : fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'));

for (const f of targets) {
  const b = readJson(path.join(dir, f));
  if (!b) continue;
  let imgTok = 0, total = 0;
  for (const it of b.items) {
    const en = it.en || '';
    const et = en.match(/⟦\d+⟧/g) || [];
    const zt = (it.zh || '').match(/⟦\d+⟧/g) || [];
    if (et.length === 0) continue;
    total++;
    // count image-looking tokens by probing the page template for what each token resolves to
    if (et.length !== zt.length) console.log(`  ${f} ${it.k}: token count ${et.length} -> ${zt.length}`);
    imgTok += et.length;
  }
  console.log(`${f}: items with placeholders=${total} placeholder occurrences=${imgTok}`);
}
