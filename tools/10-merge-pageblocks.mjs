// Merge page-block translations (data/pageblocks/*.zh.json) into the translation memory.
// Each block is validated against the English source before anything is written.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';
import { Store } from './translate.mjs';
import { isCodeUnit, isMathArtifact } from './classify.mjs';

const TOK = /⟦\d+⟧/g;
const toks = (s) => (String(s).match(TOK) || []).join('');
const dir = path.join(DATA, 'pageblocks');
if (!fs.existsSync(dir)) { console.error('no data/pageblocks directory'); process.exit(1); }

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.zh.json'));
const units = readJson(path.join(DATA, 'units.json'), []);
const byK = new Map(units.map((u) => [u.k, u.en]));
// Reverse index. Unit keys are content hashes, so they move whenever the unit collector changes
// (it did: nested-block units were replaced by the leaf blocks the renderer can actually apply).
// Hand-written block files carry the key that was current when they were written, so resolve a
// stale key through its English text instead of discarding otherwise-valid translation work.
const byEn = new Map();
for (const u of units) if (!byEn.has(u.en)) byEn.set(u.en, u.k);
const store = new Store();
// Last-resort recovery: older block files store only {k, zh}. When the key no longer resolves
// AND the file omits `en`, recover the English from the translation memory by matching the
// Chinese. Exact matches are tried first (they resolve together with their placeholders), then
// the placeholder-stripped form, so a moved ⟦n⟧ cannot hide a match.
const enByZh = new Map();
const enByZhSkeleton = new Map();
const skeleton = (s) => String(s).replace(TOK, '\u0001');
for (const rec of Object.values(store.data)) {
  if (!rec || !rec.zh || !rec.en) continue;
  if (!enByZh.has(rec.zh)) enByZh.set(rec.zh, rec.en);
  const sk = skeleton(rec.zh);
  if (!enByZhSkeleton.has(sk)) enByZhSkeleton.set(sk, rec.en);
}
const strict = process.argv.includes('--strict');
let added = 0, errors = 0, total = 0, stale = 0, recovered = 0, codeSkipped = 0, noop = 0;
for (const f of files) {
  const block = readJson(path.join(dir, f));
  for (const it of block.items || []) {
    total++;
    // The block file itself is authoritative for what English it translates; a key lookup only
    // supplies it when the file omits `en`.
    let en = it.en || byK.get(it.k);
    if (!en && it.zh) {
      en = enByZh.get(it.zh) || enByZhSkeleton.get(skeleton(it.zh));
      if (en) recovered++;
    }
    if (!en || !it.zh) {
      // A block whose content is pure script/identifier has no English in the unit table and
      // nothing to translate: it is byte-identical game code, correctly absent from the memory.
      // That is by design (see tools/classify.mjs), not a merge failure.
      if (it.zh && (isCodeUnit(it.zh) || isMathArtifact(it.zh))) { codeSkipped++; continue; }
      errors++; console.error(`  ${f} ${it.k}: missing en/zh`); continue;
    }
    if (strict && it.en === undefined && !byK.has(it.k)) {
      errors++;
      console.error(`  ${f} ${it.k}: stale key (english resolves to ${byEn.get(en) || 'nothing'})`);
      continue;
    }
    if (it.en === undefined && !byK.has(it.k)) stale++;
    if (toks(en) !== toks(it.zh)) { errors++; console.error(`  ${f} ${it.k}: placeholder mismatch`); continue; }
    // Store.set returns false when the entry would not change anything: empty, or the "translation"
    // is byte-identical to the English. Strings such as "[a]", "[b]" and "0.1x" legitimately carry
    // no text to translate, so they are correct to keep as-is and must not inflate the accepted
    // count (that over-reporting is what made 3 Weather items look untranslated in 08b).
    if (store.set(en, it.zh)) added++;
    else noop++;
  }
}
store.flush();
console.log(`blocks=${files.length} items=${total} accepted=${added} noop=${noop} codeSkipped=${codeSkipped} errors=${errors} staleKeys=${stale} recoveredFromMemory=${recovered} | memory size=${store.size}`);
process.exitCode = errors ? 1 : 0;
