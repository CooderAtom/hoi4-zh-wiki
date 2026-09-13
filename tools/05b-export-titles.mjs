// Step 5c: export just the page titles (high leverage: sidebar, index, breadcrumbs).
//   data/batches/titles.zh.json is what we fill in.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';
import { Store, key } from './translate.mjs';

const fetched = readJson(path.join(DATA, 'fetched.json'), { pages: {} });
const store = new Store();
const titles = new Map();
for (const [req, info] of Object.entries(fetched.pages)) {
  if (!info.ok) continue;
  for (const t of [info.title, req, ...(info.redirectedFrom || [])]) {
    if (!t || titles.has(t)) continue;
    titles.set(t, { k: key(t), en: t, translated: store.has(t) ? store.get(t) : null });
  }
}
const all = [...titles.values()];
const todo = all.filter((t) => !t.translated);
const out = path.join(DATA, 'batches', 'titles.json');
writeJson(out, {
  batch: 'titles',
  note: '页面标题翻译。译名会用于侧栏、索引、目录与页面大标题。',
  instructions: 'Translate each title into Simplified Chinese. Keep game terms consistent with glossary.json. Return {"items":[{"k":"...","zh":"..."}]}.',
  glossary: readJson(path.join(DATA, 'glossary.json'), {}),
  units: todo.map((t) => ({ k: t.k, en: t.en })),
});
console.log('titles total:', all.length, '| todo:', todo.length, '| chars:', todo.reduce((s, t) => s + t.en.length, 0));
console.log('written:', out);
