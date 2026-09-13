// Rebuild the translation memory from the batch files (the authoritative source).
// Run: node tools/06c-rebuild-tm.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';
import { Store, TR_DIR, key } from './translate.mjs';

// 1. wipe the (damaged) shard directory
let removed = 0;
if (fs.existsSync(TR_DIR)) {
  for (const f of fs.readdirSync(TR_DIR)) { fs.unlinkSync(path.join(TR_DIR, f)); removed++; }
}
console.log('cleared shards:', removed);

// 2. load every translated batch and titles file
const BATCH_DIR = path.join(DATA, 'batches');
const files = fs.readdirSync(BATCH_DIR).filter((f) => /\.zh\.json$/.test(f) && !/receipt/.test(f));
const store = new Store();
let items = 0, accepted = 0, skipped = 0;

const TOKEN_RE = /⟦\s*(\d+)\s*⟧/g;
const tokensOf = (s) => [...String(s).matchAll(TOKEN_RE)].map((m) => m[1]).join(',');
const units = readJson(path.join(DATA, 'units.json'), []);
const enByKey = new Map(units.map((u) => [u.k, u.en]));

for (const f of files) {
  const d = readJson(path.join(BATCH_DIR, f));
  const list = d?.items;
  if (!Array.isArray(list)) { console.log('skip (no items):', f); continue; }
  for (const it of list) {
    items++;
    const en = it.en || enByKey.get(it.k);
    if (!en) { skipped++; continue; }
    const zh = it.zh;
    if (typeof zh !== 'string' || !zh.trim()) { skipped++; continue; }
    if (tokensOf(en) !== tokensOf(zh)) { skipped++; continue; }
    if (store.set(en, zh)) accepted++;
  }
}
const shards = store.flush();
console.log(`files=${files.length} items=${items} accepted=${accepted} skipped=${skipped}`);
console.log('memory size:', store.size, '| shards written:', shards);

// 3. verify by reloading from disk
const check = new Store();
console.log('reload check size:', check.size);
console.log('sample: Government ->', check.get('Government'), '| political power ->', check.get('political power'));
