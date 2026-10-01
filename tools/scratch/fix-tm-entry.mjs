// Fix individual translation-memory entries in place.
//   node tools/scratch/fix-tm-entry.mjs
import { Store } from '../translate.mjs';

const PAIRS = [
  // The label dictionary translated only the "Storage" part of this Launch options string,
  // leaving a half-English "储存：2 GB available space" in memory.
  ['Storage: 2 GB available space', '存储空间：2 GB 可用空间'],
];

const store = new Store();
for (const [en, zh] of PAIRS) {
  const before = store.get(en);
  const changed = store.set(en, zh);
  console.log(JSON.stringify(en), '->', JSON.stringify(zh), '| before:', JSON.stringify(before), '| changed:', changed);
}
console.log('flushed:', store.flush(), '| memory size:', store.size);
