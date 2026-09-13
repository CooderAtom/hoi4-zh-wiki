// Step 6d: fold the shared supplementary glossary into the translation memory.
//   exact strings first, then ⟦n⟧-aware patterns (only where the token count matches).
import path from 'node:path';
import fs from 'node:fs';
import { DATA, readJson } from './lib.mjs';
import { Store } from './translate.mjs';
import { EXACT, PATTERNS } from './glossary-extra.mjs';

const TOKEN = /⟦(\d+)⟧/g;
const tokens = (s) => [...String(s).matchAll(TOKEN)].map((m) => m[0]);

const store = new Store();
const units = readJson(path.join(DATA, 'units.json'), []);
const byEn = new Map(units.map((u) => [u.en, u]));

const compiled = PATTERNS.map(([src, zh]) => ({ src, zh, toks: tokens(src) }));
const usedPatterns = new Map();

let exact = 0, patterned = 0;
const apply = (en, zh) => {
  if (!en || !zh || en === zh) return false;
  if (store.has(en) && store.get(en) === zh) return false;
  if (store.has(en)) return false;                    // keep hand-written translations
  store.set(en, zh);
  return true;
};

for (const u of units) {
  const en = u.en;
  if (store.has(en)) continue;
  if (EXACT[en]) { if (apply(en, EXACT[en])) exact++; continue; }
  const ut = tokens(en);
  if (!ut.length) continue;
  for (const p of compiled) {
    if (p.toks.length !== ut.length) continue;
    // build an anchored regex from the pattern, each ⟦n⟧ becoming one capture group
    let re = '^', k = 0;
    const raw = p.src;
    for (let i = 0; i < raw.length;) {
      const m = /^⟦\d+⟧/.exec(raw.slice(i));
      if (m) { re += '(⟦\\d+⟧)'; i += m[0].length; k++; continue; }
      re += raw[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i++;
    }
    re += '$';
    const m = new RegExp(re).exec(en);
    if (!m) continue;
    let gi = 0;
    const zh = p.zh.replace(/⟦\d+⟧/g, () => m[++gi]);
    if (!apply(en, zh)) continue;
    patterned++;
    usedPatterns.set(p.src, (usedPatterns.get(p.src) || 0) + 1);
    break;
  }
}

store.flush();
console.log(`glossary exact=${exact} patterned=${patterned} | memory size=${store.size}`);
const top = [...usedPatterns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log('top patterns:', top.map(([s, n]) => `${s}(${n})`).join(', '));
const unused = PATTERNS.map(([s]) => s).filter((s) => !usedPatterns.has(s));
console.log('unused patterns:', unused.length, unused.slice(0, 6));
const unusedExact = Object.keys(EXACT).filter((e) => !byEn.has(e));
console.log('glossary exact entries with no matching unit:', unusedExact.length, unusedExact.slice(0, 8));
