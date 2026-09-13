// Step 5b: apply translated batch files back into the translation memory.
//   reads data/batches/batch-*.json (with an added "items" array) or *.zh.json
// usage: node tools/06-apply.mjs [file ...]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';
import { Store, key, normalize } from './translate.mjs';

const BATCH_DIR = path.join(DATA, 'batches');
const todo = JSON.parse(fs.readFileSync(path.join(DATA, 'units.json'), 'utf8'));
const unitByKey = new Map(todo.map((u) => [u.k, u]));

const files = process.argv.slice(2).length
  ? process.argv.slice(2).map((f) => path.resolve(f))
  : fs.readdirSync(BATCH_DIR)
    .filter((f) => /\.zh\.json$/.test(f) && /^batch-\d+\.zh\.json$|^titles\.zh\.json$/.test(f))
    .map((f) => path.join(BATCH_DIR, f));

const store = new Store();
const report = { files: 0, items: 0, applied: 0, changed: 0, errors: [] };

const TOKEN_RE = /⟦\s*(\d+)\s*⟧/g;
const tokensOf = (s) => [...String(s).matchAll(TOKEN_RE)].map((m) => m[1]).sort().join(',');

function check(en, zh) {
  const problems = [];
  if (typeof zh !== 'string' || !zh.trim()) problems.push('empty');
  else {
    if (tokensOf(en) !== tokensOf(zh)) problems.push(`placeholder mismatch (en:${tokensOf(en) || '-'} zh:${tokensOf(zh) || '-'})`);
    if (/<[a-zA-Z/][^>]*>/.test(zh) && !/<[a-zA-Z/][^>]*>/.test(en)) problems.push('introduced html tag');
    const enLen = normalize(en).length, zhLen = normalize(zh).length;
    if (enLen > 24 && zhLen > enLen * 1.6) problems.push('suspiciously long');
    if (enLen > 8 && /^[\x00-\x7F\s]*$/.test(zh)) problems.push('not translated (ascii only)');
  }
  return problems;
}

for (const f of files) {
  const data = readJson(f);
  if (!data) { report.errors.push(`${path.basename(f)}: unreadable`); continue; }
  const items = data.items || data;
  if (!Array.isArray(items)) { report.errors.push(`${path.basename(f)}: no items array`); continue; }
  report.files++;
  for (const it of items) {
    report.items++;
    // page titles / redirect aliases may not exist in units.json: accept the source text as-is
    const en = it.en || unitByKey.get(it.k)?.en;
    if (!en) { report.errors.push(`${path.basename(f)}: item without en/k`); continue; }
    const k = it.k || key(en);
    const probs = check(en, it.zh);
    if (probs.length) { report.errors.push(`${path.basename(f)} [${k}] ${probs.join('; ')} :: ${String(it.zh).slice(0, 60)}`); continue; }
    report.applied++;
    if (store.set(en, it.zh)) report.changed++;
  }
  // remove the translated payload so the batch file stays small, keep a receipt
  if (!f.endsWith('.receipt.json') && data.items) {
    writeJson(f.replace(/\.json$/, '') + '.receipt.json', { batch: data.batch, appliedAt: new Date().toISOString(), items: items.length, pages: data.pages });
  }
}

const written = store.flush();
console.log(`files=${report.files} items=${report.items} accepted=${report.applied} new=${report.changed} shardsWritten=${written}`);
console.log('translation memory size:', store.size);
if (report.errors.length) {
  console.log(`\n${report.errors.length} problems (first 25):`);
  report.errors.slice(0, 25).forEach((e) => console.log('  -', e));
}
