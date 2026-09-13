// Verify a translation block: every key must exist in the source and the English must match.
//   node tools/10b-verify-block.mjs Modifiers.b05.zh.json
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';

const f = process.argv[2];
if (!f) { console.error('usage: node tools/10b-verify-block.mjs <block.zh.json>'); process.exit(1); }
const b = readJson(path.join(DATA, 'pageblocks', f));
const byK = new Map(readJson(path.join(DATA, 'units.json'), []).map((u) => [u.k, u.en]));
const tpl = readJson(path.join(DATA, 'pageblocks', (b.page || '').replace(/[^\w.-]+/g, '_').slice(0, 60) + '.template.json'));
const tplMap = tpl ? new Map(tpl.items.map((i) => [i.k, i.en])) : new Map();

let unknown = 0, mismatch = 0, ok = 0;
for (const it of b.items) {
  const src = byK.get(it.k) ?? tplMap.get(it.k);
  if (src === undefined) { unknown++; console.log(`  ${it.k}: NOT IN SOURCE  (claimed en: ${JSON.stringify((it.en || '').slice(0, 60))})`); continue; }
  if (it.en && it.en !== src) {
    mismatch++; console.log(`  ${it.k}: EN MISMATCH\n     block: ${it.en.slice(0, 90)}\n     source: ${src.slice(0, 90)}`);
    continue;
  }
  ok++;
}
console.log(`${f}: ok=${ok} unknown=${unknown} enMismatch=${mismatch}`);
process.exitCode = unknown || mismatch ? 1 : 0;
