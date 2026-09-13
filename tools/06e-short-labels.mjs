// Step 6e: apply the compositional short-label translator to remaining short units.
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';
import { Store } from './translate.mjs';
import { translateShort, translateWords, DICT_SIZE } from './short-translate.mjs';

const dry = process.argv.includes('--dry');
const store = new Store();
const units = readJson(path.join(DATA, 'units.json'), []);
const todo = units.filter((u) => !store.get(u.en));
console.log('dict:', JSON.stringify(DICT_SIZE));
console.log('untranslated units:', todo.length);

let short = 0, words = 0;
const samples = [];
for (const u of todo) {
  if (store.has(u.en)) continue;
  let zh = translateShort(u.en);
  let kind = 'exact';
  if (!zh) { zh = translateWords(u.en); kind = 'words'; }
  if (!zh) continue;
  if (!/[\u4e00-\u9fff]/.test(zh)) continue;              // must actually contain Chinese
  const srcToks = (u.en.match(/⟦\d+⟧/g) || []).join('');
  const zhToks = (zh.match(/⟦\d+⟧/g) || []).join('');
  if (srcToks !== zhToks) continue;                        // placeholder sequence must match
  if (samples.length < 25) samples.push(`${kind}  ${JSON.stringify(u.en)} -> ${zh}`);
  if (kind === 'exact') short++; else words++;
  if (!dry) store.set(u.en, zh);
}
if (!dry) store.flush();
console.log(`label translations: phrase/pattern=${short} word-level=${words} total=${short + words}`);
console.log(`memory size now: ${store.size}`);
console.log('samples:\n  ' + samples.join('\n  '));
